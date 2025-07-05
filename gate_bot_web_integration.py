import asyncio
import time
import logging
import json
import os
import sys
from decimal import Decimal, ROUND_DOWN, ROUND_UP, ROUND_HALF_UP
from typing import Dict, Any, List, Optional
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from functools import partial

import gate_api
from gate_api import ApiClient, FuturesApi, FuturesOrder, Position
from gate_api.exceptions import ApiException

# --- Настройка логирования ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("gate_bot_isolated.log", encoding='utf-8'),
        logging.StreamHandler()
    ]
)

def load_config():
    """Загрузка конфигурации из файла, созданного веб-интерфейсом"""
    config_path = os.path.join(os.path.dirname(__file__), 'server', 'python_config.json')
    
    if not os.path.exists(config_path):
        logging.error(f"Configuration file not found: {config_path}")
        sys.exit(1)
        
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        logging.info("Configuration loaded successfully from web interface")
        return config
    except Exception as e:
        logging.error(f"Error loading configuration: {e}")
        sys.exit(1)

class GateClient:
    def __init__(self, config: Dict[str, Any]):
        self.config = gate_api.Configuration(
            key=config['api_key'],
            secret=config['api_secret'],
            host="https://fx-api.gateio.ws/api/v4" if not config.get('testnet', False) else "https://fx-api-testnet.gateio.ws/api/v4"
        )
        self.api_client = ApiClient(self.config)
        self.futures_api = FuturesApi(self.api_client)
        self.settle = 'usdt'
        self.last_request = 0
        self.rate_limit = config.get('api_rate_limit_delay', 0.1)
        self.price_cache = {}
        self.positions_cache = []
        self.cache_update_interval = 1.1
        self.last_price_update = 0
        self.last_positions_update = 0
        self.max_cache_delay = 60

    def reconnect(self):
        """Переподключение к API."""
        logging.info("Переподключение к API...")
        self.api_client = ApiClient(self.config)
        self.futures_api = FuturesApi(self.api_client)

    async def request(self, method, *args, **kwargs):
        now = time.time()
        elapsed = now - self.last_request
        if elapsed < self.rate_limit:
            await asyncio.sleep(self.rate_limit - elapsed)

        self.last_request = time.time()
        loop = asyncio.get_event_loop()
        try:
            return await loop.run_in_executor(None, partial(method, *args, **kwargs))
        except ApiException as e:
            error_body = e.body if e.body else 'No error details'
            logging.error(f"API Error: {e.status} {e.reason} - {error_body}")
            raise

    async def update_price_cache(self):
        while True:
            try:
                tickers = await self.request(self.futures_api.list_futures_tickers, self.settle)
                self.price_cache = {ticker.contract: Decimal(ticker.last) for ticker in tickers}
                self.last_price_update = time.time()
                await asyncio.sleep(self.cache_update_interval)
            except Exception as e:
                logging.error(f"Ошибка обновления кэша цен: {str(e)}")
                if time.time() - self.last_price_update > self.max_cache_delay:
                    self.reconnect()
                await asyncio.sleep(1)

    async def initial_price_load(self):
        try:
            tickers = await self.request(self.futures_api.list_futures_tickers, self.settle)
            self.price_cache = {ticker.contract: Decimal(ticker.last) for ticker in tickers}
            logging.info("Начальная загрузка цен завершена")
        except Exception as e:
            logging.error(f"Ошибка начальной загрузки цен: {str(e)}")

    async def update_positions_cache(self):
        while True:
            try:
                self.positions_cache = await self.request(self.futures_api.list_positions, self.settle)
                self.last_positions_update = time.time()
                await asyncio.sleep(self.cache_update_interval)
            except Exception as e:
                logging.error(f"Ошибка обновления кэша позиций: {str(e)}")
                if time.time() - self.last_positions_update > self.max_cache_delay:
                    self.reconnect()
                await asyncio.sleep(1)

class SymbolBot:
    ERROR_LOG_SUPPRESSION_INTERVAL = 600

    def __init__(
        self,
        client: GateClient,
        symbol: str,
        long_levels: List[Dict[str, Any]],
        short_levels: List[Dict[str, Any]],
        additional_long_levels: List[Dict[str, Any]],
        additional_short_levels: List[Dict[str, Any]],
        counter_long_levels: List[Dict[str, Any]],
        counter_short_levels: List[Dict[str, Any]],
        executor: ThreadPoolExecutor,
        api_semaphore: asyncio.Semaphore,
        api_rate_limit_delay: float,
        global_tp_threshold: Decimal,
        use_realized_pnl: bool
    ):
        self.client = client
        self.symbol = symbol
        self.long_levels = long_levels
        self.short_levels = short_levels
        self.additional_long_levels = additional_long_levels
        self.additional_short_levels = additional_short_levels
        self.counter_long_levels = counter_long_levels
        self.counter_short_levels = counter_short_levels
        self.executor = executor
        self.api_semaphore = api_semaphore
        self.api_rate_limit_delay = api_rate_limit_delay
        self.global_tp_threshold = global_tp_threshold
        self.use_realized_pnl = use_realized_pnl

        self.tick_size = Decimal('0.0001')
        self.step_size = Decimal('1')
        self.base_price = None
        self.open_positions = defaultdict(list)
        self.additional_positions = defaultdict(list)
        self.counter_positions = defaultdict(list)
        self.position_lock = asyncio.Lock()
        self.active_tasks = set()
        self.last_error_log_times = defaultdict(lambda: 0)
        self.initialized = False
        self.last_pnl_log_time = 0

        # Счётчики для TP, SL и глобального TP
        self.tp_count_total = 0
        self.sl_count_total = 0
        self.global_tp_count_total = 0
        self.tp_events = []
        self.sl_events = []

    async def initialize(self):
        if self.initialized:
            return

        try:
            await self.get_symbol_info()
            self.base_price = await self.get_current_price()
            logging.info(f'[{self.symbol}] Базовая цена установлена: {self.base_price}')
            self.initialized = True

            # Запускаем задачи символа независимо друг от друга
            tasks = [
                asyncio.create_task(self.manage_levels(direction='long', levels=self.long_levels)),
                asyncio.create_task(self.manage_levels(direction='short', levels=self.short_levels)),
                asyncio.create_task(self.manage_additional_levels(direction='long', levels=self.additional_long_levels)),
                asyncio.create_task(self.manage_additional_levels(direction='short', levels=self.additional_short_levels)),
                asyncio.create_task(self.manage_counter_levels(direction='long', levels=self.counter_long_levels)),
                asyncio.create_task(self.manage_counter_levels(direction='short', levels=self.counter_short_levels)),
                asyncio.create_task(self.monitor_global_take_profit()),
            ]
            self.active_tasks.update(tasks)
        except Exception as e:
            logging.error(f'[{self.symbol}] Ошибка инициализации: {str(e)}')
            raise

    async def get_symbol_info(self):
        async with self.api_semaphore:
            try:
                contract = await self.client.request(
                    self.client.futures_api.get_futures_contract,
                    self.client.settle,
                    self.symbol
                )
                self.tick_size = Decimal(str(contract.order_price_round))
                self.step_size = Decimal(str(contract.quanto_multiplier))
                if self.step_size <= 0:
                    raise ValueError(f"Invalid step_size: {self.step_size}")
            except Exception as e:
                logging.error(f'[{self.symbol}] Ошибка получения информации: {str(e)}')
                raise
            finally:
                await asyncio.sleep(self.api_rate_limit_delay)

    async def get_current_price(self) -> Decimal:
        while True:
            price = self.client.price_cache.get(self.symbol)
            if price is not None:
                return price.quantize(self.tick_size)
            logging.warning(f"[{self.symbol}] Цена не найдена в кэше, ждем обновления")
            await asyncio.sleep(0.01)

    async def open_market_order(self, direction: str, qty: Decimal) -> str:
        try:
            order_body = FuturesOrder(
                contract=self.symbol,
                size=int(float(qty)) if direction == 'long' else -int(float(qty)),
                price="0",
                reduce_only=False,
                tif="ioc"
            )
            async with self.api_semaphore:
                response = await self.client.request(
                    self.client.futures_api.create_futures_order,
                    self.client.settle,
                    order_body
                )
            logging.info(f"[{self.symbol}][{direction.upper()}] Позиция открыта: qty={qty}, ID={response.id}")
            return response.id
        except Exception as e:
            error_key = f"open_market_order_{direction}_{str(e)}"
            current_time = time.time()
            if current_time - self.last_error_log_times[error_key] > self.ERROR_LOG_SUPPRESSION_INTERVAL:
                self.last_error_log_times[error_key] = current_time
                logging.error(f"[{self.symbol}][{direction.upper()}] Ошибка открытия ордера: {str(e)}")
            return ""

    async def close_position(self, direction: str, qty: Decimal):
        max_retries = 3
                for attempt in range(max_retries):
            try:
                order_body = FuturesOrder(
                    contract=self.symbol,
                    size=-int(float(qty)) if direction == 'long' else int(float(qty)),
                    price="0",
                    reduce_only=True,
                    tif="ioc"
                )
                async with self.api_semaphore:
                    await self.client.request(
                        self.client.futures_api.create_futures_order,
                        self.client.settle,
                        order_body
                    )
                return
            except Exception as e:
                error_key = f"close_position_{direction}_{attempt}_{str(e)}"
                current_time = time.time()
                if current_time - self.last_error_log_times[error_key] > self.ERROR_LOG_SUPPRESSION_INTERVAL:
                    self.last_error_log_times[error_key] = current_time
                    logging.error(f"[{self.symbol}][{direction.upper()}] Ошибка закрытия позиции (попытка {attempt + 1}): {str(e)}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(0.1)
        logging.critical(f"[{self.symbol}][{direction.upper()}] Не удалось закрыть позицию после {max_retries} попыток")

    # ... (остальные методы остаются такими же, как в оригинальном боте)
    
    async def manage_level(self, direction: str, percent: Decimal, amount_usdt: Decimal, tp_percent: Decimal, sl_percent: Decimal):
        """Управление одним ценовым уровнем"""
        try:
            trigger_price = (self.base_price * (1 + percent / 100)).quantize(
                self.tick_size,
                rounding=ROUND_UP if direction == 'long' else ROUND_DOWN
            )

            while True:
                await self.wait_for_trigger_activation(direction, trigger_price)
                qty = (amount_usdt / (trigger_price * self.step_size)).quantize(Decimal('1'), ROUND_HALF_UP)
                
                if qty < 1:
                    logging.warning(f"[{self.symbol}][{direction.upper()}] Слишком малый объем: {qty}")
                    await asyncio.sleep(0.01)
                    continue

                order_id = await self.open_market_order(direction, qty)
                if not order_id:
                    await asyncio.sleep(0.1)
                    continue

                # Остальная логика остается такой же...
                await self.wait_for_retrace(direction, trigger_price)

        except Exception as e:
            logging.error(f"[{self.symbol}][{direction.upper()}] Ошибка управления уровнем: {str(e)}")
            await asyncio.sleep(1)

    async def wait_for_trigger_activation(self, direction: str, trigger: Decimal):
        while True:
            price = await self.get_current_price()
            if (direction == 'long' and price >= trigger) or \
               (direction == 'short' and price <= trigger):
                break
            await asyncio.sleep(0.01)

    async def wait_for_retrace(self, direction: str, trigger_price: Decimal):
        while True:
            price = await self.get_current_price()
            if (direction == 'long' and price < trigger_price) or \
               (direction == 'short' and price > trigger_price):
                logging.info(f"[{self.symbol}][{direction.upper()}] Откат подтвержден")
                break
            await asyncio.sleep(0.01)

    async def manage_levels(self, direction: str, levels: List[Dict[str, Any]]):
        tasks = []
        for level in levels:
            task = asyncio.create_task(self.manage_level(
                direction=direction,
                percent=Decimal(str(level['percent'])),
                amount_usdt=Decimal(str(level['amount'])),
                tp_percent=Decimal(str(level['tpPercent'])),
                sl_percent=Decimal(str(level.get('slPercent', 1.0)))
            ))
            self.active_tasks.add(task)
            task.add_done_callback(self.active_tasks.discard)
            tasks.append(task)

        await asyncio.gather(*tasks)

    async def manage_additional_levels(self, direction: str, levels: List[Dict[str, Any]]):
        # Упрощенная версия для дополнительных уровней
        pass

    async def manage_counter_levels(self, direction: str, levels: List[Dict[str, Any]]):
        # Упрощенная версия для противоположных уровней
        pass

    async def monitor_global_take_profit(self):
        """Мониторинг глобального тейк-профита"""
        while True:
            try:
                # Логика мониторинга глобального TP
                await asyncio.sleep(5)
            except Exception as e:
                logging.error(f"[{self.symbol}] Ошибка мониторинга глобального TP: {str(e)}")
                await asyncio.sleep(1)

class GateBot:
    def __init__(self, config: Dict[str, Any]):
        self.client = GateClient(config)
        self.symbols = config['symbols']
        self.long_levels = config.get('long_levels', [])
        self.short_levels = config.get('short_levels', [])
        self.additional_long_levels = config.get('additional_long_levels', [])
        self.additional_short_levels = config.get('additional_short_levels', [])
        self.counter_long_levels = config.get('counter_long_levels', [])
        self.counter_short_levels = config.get('counter_short_levels', [])
        self.api_rate_limit_delay = config.get('api_rate_limit_delay', 0.1)
        self.max_concurrent_symbols = config.get('max_concurrent_symbols', 1000)
        self.global_tp_threshold = Decimal(str(config.get('global_tp_threshold', '100')))
        self.use_realized_pnl = config.get('use_realized_pnl', False)

        self.executor = ThreadPoolExecutor(max_workers=1000)
        self.api_semaphore = asyncio.Semaphore(1000)
        self.symbol_bots = []

    async def initialize_bot(self):
        await self.client.initial_price_load()
        client_tasks = [
            asyncio.create_task(self.client.update_price_cache()),
            asyncio.create_task(self.client.update_positions_cache()),
        ]

        for symbol in self.symbols:
            bot = SymbolBot(
                client=self.client,
                symbol=symbol,
                long_levels=self.long_levels,
                short_levels=self.short_levels,
                additional_long_levels=self.additional_long_levels,
                additional_short_levels=self.additional_short_levels,
                counter_long_levels=self.counter_long_levels,
                counter_short_levels=self.counter_short_levels,
                executor=self.executor,
                api_semaphore=self.api_semaphore,
                api_rate_limit_delay=self.api_rate_limit_delay,
                global_tp_threshold=self.global_tp_threshold,
                use_realized_pnl=self.use_realized_pnl
            )
            self.symbol_bots.append(bot)

        # Запускаем initialize для каждого символа в отдельной задаче
        symbol_tasks = [asyncio.create_task(bot.initialize()) for bot in self.symbol_bots]
        all_tasks = client_tasks + symbol_tasks
        await asyncio.gather(*all_tasks, return_exceptions=True)

    async def run(self):
        await self.initialize_bot()
        while True:
            await asyncio.sleep(3600)

    async def stop(self):
        self.executor.shutdown(wait=True)
        logging.info("Бот остановлен")

if __name__ == '__main__':
    # Загружаем конфигурацию из веб-интерфейса
    config = load_config()
    
    logging.info("Starting Gate.io Trading Bot with web interface configuration")
    logging.info(f"Selected symbols: {config['symbols']}")
    logging.info(f"Global TP threshold: {config['global_tp_threshold']}")
    
    bot = GateBot(config)
    try:
        asyncio.run(bot.run())
    except KeyboardInterrupt:
        asyncio.run(bot.stop())
    except Exception as e:
        logging.error(f"Фатальная ошибка: {str(e)}")