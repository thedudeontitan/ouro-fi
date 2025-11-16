"""
Ouro Finance - OrderBook Smart Contract

Based on the Sway OrderBook reference implementation, this contract provides:
- Asset pair management for trading pairs
- Exchange contract registration and validation
- Pool management for liquidity providers
- Ordered asset pair lookup and storage
"""

from algopy import *


@struct
class AssetPair:
    """Asset pair structure for trading pairs"""
    asset_a: UInt64                # First asset ID
    asset_b: UInt64                # Second asset ID
    exchange_contract: UInt64      # Associated exchange contract ID
    is_active: bool               # Whether pair is active for trading
    created_timestamp: UInt64     # Creation timestamp


@struct
class PoolInfo:
    """Pool information structure"""
    asset_pair: AssetPair         # Asset pair information
    liquidity_provider: Account   # Liquidity provider account
    total_liquidity: UInt64       # Total liquidity in pool
    fee_rate: UInt64             # Trading fee rate (basis points)


@struct
class OrderBookConfig:
    """OrderBook configuration parameters"""
    admin: Account                    # Contract administrator
    exchange_bytecode_hash: Bytes     # Valid exchange contract bytecode hash
    min_liquidity: UInt64            # Minimum liquidity requirement
    max_fee_rate: UInt64             # Maximum allowed fee rate
    is_initialized: bool             # Contract initialization status


class OuroOrderBook(ARC4Contract):
    """
    OrderBook contract for Ouro Finance DEX
    Manages asset pairs and exchange contract registration
    """

    def __init__(self) -> None:
        """Initialize orderbook with admin"""
        self.config = OrderBookConfig(
            admin=Txn.sender,
            exchange_bytecode_hash=Bytes(),
            min_liquidity=UInt64(1_000_000),      # 1 USDC minimum
            max_fee_rate=UInt64(300),              # 3% max fee
            is_initialized=False
        )

    @abimethod
    def initialize(self, exchange_bytecode_hash: Bytes) -> None:
        """
        Initialize orderbook with exchange contract bytecode
        Equivalent to Sway initialize function
        """
        assert Txn.sender == self.config.admin, "Only admin can initialize"
        assert not self.config.is_initialized, "Already initialized"
        assert len(exchange_bytecode_hash) > 0, "Invalid bytecode hash"

        # Update configuration
        self.config = OrderBookConfig(
            admin=self.config.admin,
            exchange_bytecode_hash=exchange_bytecode_hash,
            min_liquidity=self.config.min_liquidity,
            max_fee_rate=self.config.max_fee_rate,
            is_initialized=True
        )

        # Emit initialization event
        log(
            Bytes(b"orderbook_initialized:") +
            exchange_bytecode_hash
        )

    @abimethod
    def add_order(
        self,
        asset_a: UInt64,
        asset_b: UInt64,
        exchange_contract_id: UInt64,
        fee_rate: UInt64
    ) -> None:
        """
        Add new asset pair with exchange contract
        Based on Sway add_order function
        """
        assert self.config.is_initialized, "OrderBook not initialized"
        assert Txn.sender == self.config.admin, "Only admin can add orders"
        assert asset_a != asset_b, "Assets must be different"
        assert fee_rate <= self.config.max_fee_rate, "Fee rate too high"

        # Order asset pair consistently (smaller ID first)
        if asset_a > asset_b:
            asset_a, asset_b = asset_b, asset_a

        # Create asset pair
        asset_pair = AssetPair(
            asset_a=asset_a,
            asset_b=asset_b,
            exchange_contract=exchange_contract_id,
            is_active=True,
            created_timestamp=Global.latest_timestamp
        )

        # Store in box storage
        pair_key = self._get_pair_key(asset_a, asset_b)
        app.box_put(pair_key, asset_pair)

        # Create pool info
        pool_info = PoolInfo(
            asset_pair=asset_pair,
            liquidity_provider=Txn.sender,
            total_liquidity=UInt64(0),
            fee_rate=fee_rate
        )

        # Store pool info
        pool_key = self._get_pool_key(asset_a, asset_b)
        app.box_put(pool_key, pool_info)

        # Emit registration event
        log(
            Bytes(b"pool_registered:") +
            op.itob(asset_a) +
            Bytes(b":") +
            op.itob(asset_b) +
            Bytes(b":") +
            op.itob(exchange_contract_id)
        )

    @abimethod(readonly=True)
    def order(self, asset_a: UInt64, asset_b: UInt64) -> AssetPair:
        """
        Get asset pair information
        Matches Sway order function
        """
        # Order asset IDs consistently
        if asset_a > asset_b:
            asset_a, asset_b = asset_b, asset_a

        pair_key = self._get_pair_key(asset_a, asset_b)
        pair_data, exists = app.box_get(pair_key)
        assert exists, "Asset pair not found"

        return AssetPair.from_bytes(pair_data)

    @abimethod(readonly=True)
    def get_pool_info(self, asset_a: UInt64, asset_b: UInt64) -> PoolInfo:
        """Get pool information for asset pair"""
        # Order asset IDs consistently
        if asset_a > asset_b:
            asset_a, asset_b = asset_b, asset_a

        pool_key = self._get_pool_key(asset_a, asset_b)
        pool_data, exists = app.box_get(pool_key)
        assert exists, "Pool not found"

        return PoolInfo.from_bytes(pool_data)

    @abimethod
    def update_pool_liquidity(
        self,
        asset_a: UInt64,
        asset_b: UInt64,
        liquidity_amount: UInt64,
        is_add: bool
    ) -> None:
        """Update pool liquidity (exchange contract only)"""
        # Verify caller is registered exchange contract
        pair = self.order(asset_a, asset_b)
        assert Txn.sender == Address(op.itob(pair.exchange_contract)), "Only exchange can update"

        # Get current pool info
        pool_info = self.get_pool_info(asset_a, asset_b)

        # Update liquidity
        if is_add:
            new_liquidity = pool_info.total_liquidity + liquidity_amount
        else:
            assert pool_info.total_liquidity >= liquidity_amount, "Insufficient liquidity"
            new_liquidity = pool_info.total_liquidity - liquidity_amount

        # Update pool info
        updated_pool = PoolInfo(
            asset_pair=pool_info.asset_pair,
            liquidity_provider=pool_info.liquidity_provider,
            total_liquidity=new_liquidity,
            fee_rate=pool_info.fee_rate
        )

        # Store updated pool info
        if asset_a > asset_b:
            asset_a, asset_b = asset_b, asset_a
        pool_key = self._get_pool_key(asset_a, asset_b)
        app.box_put(pool_key, updated_pool)

        # Emit liquidity update event
        action = Bytes(b"add") if is_add else Bytes(b"remove")
        log(
            Bytes(b"liquidity_updated:") +
            action +
            Bytes(b":") +
            op.itob(liquidity_amount)
        )

    @abimethod
    def deactivate_pair(self, asset_a: UInt64, asset_b: UInt64) -> None:
        """Deactivate asset pair (admin only)"""
        assert Txn.sender == self.config.admin, "Only admin can deactivate"

        # Get current pair
        pair = self.order(asset_a, asset_b)

        # Update pair status
        updated_pair = AssetPair(
            asset_a=pair.asset_a,
            asset_b=pair.asset_b,
            exchange_contract=pair.exchange_contract,
            is_active=False,
            created_timestamp=pair.created_timestamp
        )

        # Store updated pair
        if asset_a > asset_b:
            asset_a, asset_b = asset_b, asset_a
        pair_key = self._get_pair_key(asset_a, asset_b)
        app.box_put(pair_key, updated_pair)

        # Emit deactivation event
        log(
            Bytes(b"pair_deactivated:") +
            op.itob(asset_a) +
            Bytes(b":") +
            op.itob(asset_b)
        )

    @abimethod(readonly=True)
    def get_all_pairs(self) -> String:
        """Get comma-separated list of all active asset pairs"""
        # In production, maintain a list of active pairs
        return String("ALGO-USDC,ETH-USDC,BTC-USDC,SOL-USDC")

    @abimethod
    def update_fee_rate(
        self,
        asset_a: UInt64,
        asset_b: UInt64,
        new_fee_rate: UInt64
    ) -> None:
        """Update trading fee rate for asset pair (admin only)"""
        assert Txn.sender == self.config.admin, "Only admin can update fees"
        assert new_fee_rate <= self.config.max_fee_rate, "Fee rate too high"

        # Get current pool info
        pool_info = self.get_pool_info(asset_a, asset_b)

        # Update fee rate
        updated_pool = PoolInfo(
            asset_pair=pool_info.asset_pair,
            liquidity_provider=pool_info.liquidity_provider,
            total_liquidity=pool_info.total_liquidity,
            fee_rate=new_fee_rate
        )

        # Store updated pool info
        if asset_a > asset_b:
            asset_a, asset_b = asset_b, asset_a
        pool_key = self._get_pool_key(asset_a, asset_b)
        app.box_put(pool_key, updated_pool)

        # Emit fee update event
        log(
            Bytes(b"fee_updated:") +
            op.itob(asset_a) +
            Bytes(b":") +
            op.itob(asset_b) +
            Bytes(b":") +
            op.itob(new_fee_rate)
        )

    @abimethod(readonly=True)
    def get_config(self) -> OrderBookConfig:
        """Get current orderbook configuration"""
        return self.config

    @abimethod(readonly=True)
    def is_pair_active(self, asset_a: UInt64, asset_b: UInt64) -> bool:
        """Check if asset pair is active for trading"""
        try:
            pair = self.order(asset_a, asset_b)
            return pair.is_active
        except:
            return False

    @abimethod(readonly=True)
    def get_exchange_contract(self, asset_a: UInt64, asset_b: UInt64) -> UInt64:
        """Get exchange contract ID for asset pair"""
        pair = self.order(asset_a, asset_b)
        assert pair.is_active, "Pair not active"
        return pair.exchange_contract

    # Internal helper functions

    def _get_pair_key(self, asset_a: UInt64, asset_b: UInt64) -> Bytes:
        """Generate box key for asset pair storage"""
        return (
            Bytes(b"pair_") +
            op.itob(asset_a) +
            Bytes(b"_") +
            op.itob(asset_b)
        )

    def _get_pool_key(self, asset_a: UInt64, asset_b: UInt64) -> Bytes:
        """Generate box key for pool storage"""
        return (
            Bytes(b"pool_") +
            op.itob(asset_a) +
            Bytes(b"_") +
            op.itob(asset_b)
        )

    def _validate_asset_pair(self, asset_a: UInt64, asset_b: UInt64) -> bool:
        """Validate asset pair parameters"""
        if asset_a == 0 or asset_b == 0:
            return False
        if asset_a == asset_b:
            return False
        return True

    def _calculate_ordered_pair(self, asset_a: UInt64, asset_b: UInt64) -> (UInt64, UInt64):
        """Return asset pair in consistent order (smaller ID first)"""
        if asset_a > asset_b:
            return asset_b, asset_a
        return asset_a, asset_b