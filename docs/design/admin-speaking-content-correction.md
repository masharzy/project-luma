# Speaking books and content alignment correction

Speaking keeps the existing illustrated Cambridge book and cover/caption treatment used by the catalog, with the requested collection → volume → test → parts flow. It shows source volume names, publisher/volume titles and ISBNs where registered, published counts, duration, part names and question counts. Existing Speaking question editors and source documents are unchanged.

The unlinked entry `Test - 15 · Speaking` had been incorrectly promoted into a collection by title inference. Collections now resolve through Cambridge source links or a registered book volume (including exact legacy Collins title matches). Unlinked entries remain editable in a collapsed Unassigned section and never appear as books. No content is deleted or renamed, and no database migration is needed.

Learning Resources has aligned search/category/count controls, resource summaries and consistent footer actions. Vocabulary has an aligned heading/Add action, responsive search/status controls, grouped bulk actions and explicit Edit buttons. Empty states explain the next action. CSS is scoped to these admin sections.

Validation: TypeScript, optimized production build and 169 unit/security tests passed. Fixtures verified Speaking covers, resource cards, populated vocabulary and a 390px vocabulary editor. New regression cases cover Test 15 classification, authoritative source metadata, exact Collins volume matching and part counts. Fixture writes are disabled.
