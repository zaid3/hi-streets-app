# Account and data deletion operations

The current release offers a genuine deletion **request** through the operator's support email. It does not claim to automatically erase an account. Google permits a prominent in-app link to a web resource with a customer service email: https://support.google.com/googleplay/android-developer/answer/13327111.

Before publishing, the operator must monitor ahaque@atomicmail.io, publish public/delete-account.html at https://app.histreets.uk/delete-account.html, and carry out requests. Sending a request and completing deletion are different states.

For each request:

1. Verify account ownership through the registered email or an appropriate support flow. Do not request passwords. Confirm whether the request covers account deletion or only specified submissions.
2. Inventory the account's personal data and Storage objects, ownership, memberships, invitations, posts, applications, verification records and reports. Inspect actual current foreign keys and function definitions. Do not assume deleting an Auth user cleans every item.
3. Review shared-business ownership and other people's job applications separately. Preserve their independent records and access. Do not delete a shared file until any necessary reference/ownership transfer has completed and been checked.
4. Remove the user's personal data and files through supported APIs. Use the Storage API to remove file bytes, never directly delete storage.objects metadata. Remove identifying content from authored records retained only to preserve other people's independent references.
5. Remove account-linked reports or redact personal details where a specific legitimate retention need applies. Clear reviewer identifiers on unrelated records. Do not invent a blanket retention period.
6. Revoke sessions and delete the Auth account through the supported admin API. Existing access tokens can outlive deletion, so verify sensitive access is no longer possible. Review existing delete_my_account before using it; its presence alone is not proof of complete file/session cleanup.
7. Address provider-held personal data and recipient copies where applicable. Explain anything that must remain, with the actual reason and period. Confirm completion to the requester only after verification.

This procedure requires an authorised operator. It deliberately contains no script that deletes a real account without a reviewed inventory and confirmation.
