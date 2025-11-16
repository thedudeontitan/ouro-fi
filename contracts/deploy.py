"""
Deployment script for Perpetual DEX smart contracts on Algorand
"""

import algopy
from algosdk import account, mnemonic
from algosdk.v2client import algod
from algosdk.transaction import ApplicationCreateTxn, PaymentTxn, wait_for_confirmation
from algosdk.logic import get_application_address
import base64
import json
import os

class ContractDeployer:
    def __init__(self, algod_client, private_key):
        self.algod_client = algod_client
        self.private_key = private_key
        self.sender = account.address_from_private_key(private_key)

    def deploy_price_oracle(self):
        """Deploy the price oracle contract"""
        print("Deploying Price Oracle...")

        # Compile the contract (this is pseudo-code, actual compilation depends on your setup)
        # In a real scenario, you'd use algokit or algopy to compile the contract
        approval_program = self._compile_contract("PriceOracle.py")
        clear_program = self._compile_clear_program()

        # Create application
        txn = ApplicationCreateTxn(
            sender=self.sender,
            sp=self.algod_client.suggested_params(),
            on_complete=0,  # NoOp
            approval_program=approval_program,
            clear_program=clear_program,
            global_schema={'num_ints': 10, 'num_byte_slices': 10},
            local_schema={'num_ints': 0, 'num_byte_slices': 0},
            extra_pages=3  # For box storage
        )

        signed_txn = txn.sign(self.private_key)
        txid = self.algod_client.send_transaction(signed_txn)

        result = wait_for_confirmation(self.algod_client, txid)
        app_id = result['application-index']

        print(f"Price Oracle deployed with App ID: {app_id}")
        return app_id

    def deploy_funding_rate_manager(self):
        """Deploy the funding rate manager contract"""
        print("Deploying Funding Rate Manager...")

        approval_program = self._compile_contract("FundingRateManager.py")
        clear_program = self._compile_clear_program()

        txn = ApplicationCreateTxn(
            sender=self.sender,
            sp=self.algod_client.suggested_params(),
            on_complete=0,
            approval_program=approval_program,
            clear_program=clear_program,
            global_schema={'num_ints': 15, 'num_byte_slices': 5},
            local_schema={'num_ints': 0, 'num_byte_slices': 0},
            extra_pages=3
        )

        signed_txn = txn.sign(self.private_key)
        txid = self.algod_client.send_transaction(signed_txn)

        result = wait_for_confirmation(self.algod_client, txid)
        app_id = result['application-index']

        print(f"Funding Rate Manager deployed with App ID: {app_id}")
        return app_id

    def deploy_perpetual_dex(self, oracle_app_id, funding_manager_app_id):
        """Deploy the main perpetual DEX contract"""
        print("Deploying Perpetual DEX...")

        approval_program = self._compile_contract("PerpetualDEX.py")
        clear_program = self._compile_clear_program()

        txn = ApplicationCreateTxn(
            sender=self.sender,
            sp=self.algod_client.suggested_params(),
            on_complete=0,
            approval_program=approval_program,
            clear_program=clear_program,
            global_schema={'num_ints': 20, 'num_byte_slices': 10},
            local_schema={'num_ints': 5, 'num_byte_slices': 5},
            extra_pages=5  # Large box storage for positions
        )

        signed_txn = txn.sign(self.private_key)
        txid = self.algod_client.send_transaction(signed_txn)

        result = wait_for_confirmation(self.algod_client, txid)
        app_id = result['application-index']

        print(f"Perpetual DEX deployed with App ID: {app_id}")
        return app_id

    def setup_contracts(self, dex_app_id, oracle_app_id, funding_manager_app_id, usdc_asset_id):
        """Setup and configure deployed contracts"""
        print("Setting up contracts...")

        # Setup perpetual DEX
        self._call_application_method(
            dex_app_id,
            "setup_protocol",
            [self.sender, usdc_asset_id, 50, 100]  # fee_collector, usdc_id, trading_fee, max_leverage
        )

        # Setup funding rate manager
        self._call_application_method(
            funding_manager_app_id,
            "set_perp_dex_app_id",
            [dex_app_id]
        )

        # Initialize markets
        markets = ["BTCUSD", "ETHUSD", "SOLUSD", "ALGOUSD"]
        for market in markets:
            self._call_application_method(
                funding_manager_app_id,
                "initialize_market",
                [market, 10, 1000, 3600]  # symbol, base_rate, max_rate, interval
            )

        print("Contracts setup completed!")

    def fund_contracts(self, app_ids, amount_per_contract=1000000):  # 1 ALGO per contract
        """Fund contracts with ALGO for transaction fees"""
        for app_id in app_ids:
            app_address = get_application_address(app_id)

            txn = PaymentTxn(
                sender=self.sender,
                sp=self.algod_client.suggested_params(),
                receiver=app_address,
                amt=amount_per_contract,
            )

            signed_txn = txn.sign(self.private_key)
            txid = self.algod_client.send_transaction(signed_txn)
            wait_for_confirmation(self.algod_client, txid)

            print(f"Funded contract {app_id} with {amount_per_contract/1000000} ALGO")

    def _compile_contract(self, filename):
        """Compile contract (pseudo-code - implement based on your compilation setup)"""
        # This is a placeholder - actual implementation would use algopy or algokit
        # to compile the Python contract to TEAL bytecode
        return b"placeholder_approval_program"

    def _compile_clear_program(self):
        """Compile clear program"""
        # Simple clear program that always approves
        return b"placeholder_clear_program"

    def _call_application_method(self, app_id, method, args):
        """Call application method (simplified)"""
        # This is a placeholder - actual implementation would use proper ABI encoding
        print(f"Calling {method} on app {app_id} with args {args}")

def main():
    # Configuration
    ALGOD_TOKEN = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    ALGOD_SERVER = "http://localhost:4001"
    USDC_ASSET_ID = 31566704  # Testnet USDC

    # Initialize Algod client
    algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_SERVER)

    # Get deployer account from environment or create one
    deployer_mnemonic = os.getenv("DEPLOYER_MNEMONIC")
    if not deployer_mnemonic:
        private_key, address = account.generate_account()
        deployer_mnemonic = mnemonic.from_private_key(private_key)
        print(f"Generated new account: {address}")
        print(f"Mnemonic: {deployer_mnemonic}")
    else:
        private_key = mnemonic.to_private_key(deployer_mnemonic)

    # Deploy contracts
    deployer = ContractDeployer(algod_client, private_key)

    # Deploy in order
    oracle_app_id = deployer.deploy_price_oracle()
    funding_manager_app_id = deployer.deploy_funding_rate_manager()
    dex_app_id = deployer.deploy_perpetual_dex(oracle_app_id, funding_manager_app_id)

    # Fund contracts
    deployer.fund_contracts([oracle_app_id, funding_manager_app_id, dex_app_id])

    # Setup contracts
    deployer.setup_contracts(dex_app_id, oracle_app_id, funding_manager_app_id, USDC_ASSET_ID)

    # Save deployment info
    deployment_info = {
        "network": "testnet",
        "contracts": {
            "price_oracle": oracle_app_id,
            "funding_rate_manager": funding_manager_app_id,
            "perpetual_dex": dex_app_id
        },
        "deployer": account.address_from_private_key(private_key),
        "usdc_asset_id": USDC_ASSET_ID
    }

    with open("deployment.json", "w") as f:
        json.dump(deployment_info, f, indent=2)

    print("\nDeployment completed!")
    print(f"Deployment info saved to deployment.json")

if __name__ == "__main__":
    main()