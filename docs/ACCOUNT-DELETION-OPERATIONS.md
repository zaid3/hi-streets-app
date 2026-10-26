# Account and data deletion operations

The iOS preparation branch adds an authenticated request in Business > Privacy & safety. Requests go into `public.account_deletion_requests`; users see only their own request and the founder sees the queue under People & access. An ordinary admin cannot read other users’ requests. Anonymous callers cannot submit or read them. The registered email and request time come from server defaults and cannot be supplied by the client. Duplicate requests retain the original date.

The owner must monitor this queue daily and meet the displayed target of completing deletion within 30 days, with an email confirmation when complete. The app does not send those confirmations automatically. Publish the updated privacy and deletion pages with the frontend. The support email remains an alternative for people who cannot sign in and for requests concerning data without an account.

The intake does not erase data. The founder’s existing soft-delete account action is not permanent deletion. Do not mark a request as complete or tell the requester their data has been removed until the following procedure has been carried out and verified.

For each request:

1. Verify account ownership through the registered email or an appropriate support flow. Do not request passwords. Confirm whether the request covers account deletion or only specified submissions.
2. Inventory the account's personal data and Storage objects, ownership, memberships, invitations, posts, applications, verification records and reports. Inspect actual current foreign keys and function definitions. Do not assume deleting an Auth user cleans every item.
3. Review shared-business ownership and other people's job applications separately. Preserve their independent records and access. Do not delete a shared file until any necessary reference/ownership transfer has completed and been checked.
4. Remove the user's personal data and files through supported APIs. Use the Storage API to remove file bytes, never directly delete storage.objects metadata. Remove identifying content from authored records retained only to preserve other people's independent references.
5. Remove account-linked reports or redact personal details where a specific legitimate retention need applies. Clear reviewer identifiers on unrelated records. Do not invent a blanket retention period.
6. Revoke sessions and delete the Auth account through the supported admin API. Existing access tokens can outlive deletion, so verify sensitive access is no longer possible. Review existing delete_my_account before using it; its presence alone is not proof of complete file/session cleanup.
7. Address provider-held personal data and recipient copies where applicable. Explain anything that must remain, with the actual reason and period. Confirm completion to the requester only after verification.

This procedure requires an authorised operator. It deliberately contains no script that deletes a real account without a reviewed inventory and confirmation.

When the Auth account is removed, its pending request is removed by the foreign key. Capture the registered contact address before final removal so that completion can be confirmed, and remove that temporary copy after use unless a specific retention requirement applies. No test should create a deletion request for a real user or delete a real account.
