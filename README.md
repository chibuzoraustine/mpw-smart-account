# MPW Smart Account

Rename .env.example to .env
Fill in the required informations

Endpoints include

## Authenticateion
Authenticate user
- /auth/register
  - email
  - firstname
  - lastname
  - password
- /auth/login
  - email
  - password

## User
View user bio
- /user

## Wallet
Manage smart wallet

- /wallet/user -create user wallet
  - chain
  - type
  - 
- /wallet/user -create dynamic wallet
  - chain
  - type
  - reference_code
  - user
  - amount
  - expires (optional)

-