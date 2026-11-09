# MyFit

MyFit is an owner-private workout tracker for one account. The Site sign-in gate uses the account's ChatGPT identity; the database keys every record to the stable authenticated user ID, and every API operation reads or writes only that user's row.

## Authentication and password recovery

Visitors sign in through the private Site's ChatGPT sign-in flow. MyFit does not store or manage a separate password. If the account password needs to be changed or recovered, use the password recovery flow on the ChatGPT sign-in page. The sign-out link in the app ends the Site session.

## Persistent data

The app uses the Site D1 binding `DB`, declared in `.openai/hosting.json`. The source migration creates `user_data`; deployments apply the generated migration. The row key is the Site-authenticated user ID, so a different account cannot read the current user's training history, measurements, or notes.

If the app shows **Configurar dados**, the D1 binding is not available yet. Do not enter private measurements until that notice disappears and the status reads **Salvo**.

## Local development

The starter's portable profile can mock sign-in for local preview. Use its documented `/signin-with-chatgpt?return_to=/` route. Production does not include the mock account; production access is handled by Sites.

