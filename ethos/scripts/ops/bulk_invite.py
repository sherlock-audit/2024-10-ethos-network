import subprocess
import os
import argparse

def read_addresses(file_path):
    with open(file_path, 'r') as f:
        return [line.strip() for line in f if line.strip()]

def send_invites(addresses, dry_run=False):
    cmd = ['ETHOS_CLI_ENV=testnet', 'ethos', 'invite', 'bulk', '--wait']
    #cmd = ['ethos', 'invite', 'bulk', '--wait']
    for addr in addresses:
        cmd.extend(['-r', addr])

    cmd_str = ' '.join(cmd)

    if dry_run:
        print("Dry run: Command that would be executed:")
        print(cmd_str)
        print(f"This would send invites to {len(addresses)} addresses.")
    else:
        try:
            subprocess.run(cmd_str, shell=True, check=True)
            print(f"Successfully sent invites to {len(addresses)} addresses.")
        except subprocess.CalledProcessError as e:
            print(f"Error sending invites: {e}")

def main():
    parser = argparse.ArgumentParser(description="Send bulk invites using Ethos CLI")
    parser.add_argument("--dry-run", action="store_true", help="Perform a dry run without sending invites")
    args = parser.parse_args()

    input_file = 'extracted_wallets.txt't

    addresses = read_addresses(input_file)
    batch_size = 25

    for i in range(0, len(addresses), batch_size):
        batch = addresses[i:i+batch_size]
        print(f"Processing batch {i//batch_size + 1} ({len(batch)} addresses)")
        send_invites(batch, dry_run=args.dry_run)

if __name__ == "__main__":
    main()
