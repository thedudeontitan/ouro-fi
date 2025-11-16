#!/usr/bin/env python3
"""
Mock deployment for Ouro Finance contracts
Creates mock app IDs for testing the frontend integration
"""

import json
import time
from pathlib import Path

def create_mock_deployment():
    """Create mock deployment info for testing"""
    # Generate mock app IDs (realistic looking)
    mock_apps = {
        "oracle": 123456789,
        "dex": 123456790,
        "orderbook": 123456791
    }

    deployment_info = {
        "network": "testnet",
        "deployer_address": "VK3HGSFUCOP42OBHJLF6LEJBLNAWQIJINVX4YWWLJRRWABNJ4B46ZKPNPQ",
        "deployment_timestamp": int(time.time()),
        "contracts": mock_apps,
        "asset_ids": {
            "USDC": 10458941  # Testnet USDC
        },
        "note": "Mock deployment for frontend testing"
    }

    # Save deployment info
    output_file = Path(__file__).parent.parent / "deployment-testnet.json"
    with open(output_file, 'w') as f:
        json.dump(deployment_info, f, indent=2)

    print(f"📁 Mock deployment info saved to {output_file}")

    # Create environment file
    env_file = Path(__file__).parent.parent / ".env.testnet"
    with open(env_file, 'w') as f:
        f.write(f"# Ouro Finance - TESTNET Environment (Mock)\n")
        f.write(f"VITE_ALGORAND_NETWORK=testnet\n")
        f.write(f"VITE_PRICE_ORACLE_APP_ID={mock_apps['oracle']}\n")
        f.write(f"VITE_PERPETUAL_DEX_APP_ID={mock_apps['dex']}\n")
        f.write(f"VITE_ORDERBOOK_APP_ID={mock_apps['orderbook']}\n")
        f.write(f"VITE_USDC_ASSET_ID=10458941\n")

    print(f"📝 Environment file saved to {env_file}")

    return deployment_info

def main():
    """Create mock deployment"""
    print("🎯 Creating mock deployment for Ouro Finance...")

    deployment = create_mock_deployment()

    print("\n✅ Mock deployment created!")
    print("📋 Mock Contract App IDs:")
    for name, app_id in deployment["contracts"].items():
        print(f"   {name.capitalize()}: {app_id}")

    print(f"\n📁 Next steps:")
    print(f"1. Copy .env.testnet to .env in your project root:")
    print(f"   cp .env.testnet .env")
    print(f"2. The frontend will use mock contract IDs")
    print(f"3. Contract calls will return mock data until real contracts are deployed")

    return deployment

if __name__ == "__main__":
    main()