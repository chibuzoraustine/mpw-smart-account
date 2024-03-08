# MPW Smart Account

<!--  -->

Endpoints include

## Authenticateion

Authenticate user

- [post] /auth/register
  - email
  - firstname
  - lastname
  - password
  
- [post] /auth/login
  - email
  - password

The access token gotten afetr authenticating will be used to access the remaining routes

## User

View user bio

- [get] /user

## Wallet

Manage smart wallet

- [post] /wallet/user (create user wallet)
  - chain (chainID)
  - type (eg, usdt_arbitrum)
  
- [post] /wallet/transfer (make erc20 transfer)
  - wallet_address (account wallet address)
  - amount (amount to transfer)
  - to_address (recipient address)
  - signatures (optional) (if the address has multiple signers)
  
- [post] /wallet/transfer/batch (make batch erc20 transfer)
  - wallet_address (account wallet address)
  - amount (amount to transfer)
  - to_address (recipient address)
  - signatures (optional) (if the address has multiple signers)
  
- [post] /wallet/user/add_cosigner (add a co-signer)
  - wallet_address (account wallet address)
  - cosigner_address (new co-signer to be added)
  - signatures (optional) (if the address has multiple signers)

- [post] /wallet/user/delete_cosigner (delete a co-signer)
  - wallet_address (account wallet address)
  - cosigner_address (new co-signer to be added)
  - signatures (signers of the wallet address)
  
- [post] /wallet/dynamic (create dynamic wallet)
  - chain (chainID)
  - type (eg, usdt_arbitrum)
  - reference_code (order reference code)
  - user (userId of the merchant/user)
  - amount 
  - expires (optional) (if the merchant wants set expiry time. value is in minutes)
  
- [post] /wallet/dynamic/settle (called by webhook to settle amount sent to dynamic)
  - wallet_address (account wallet address)

