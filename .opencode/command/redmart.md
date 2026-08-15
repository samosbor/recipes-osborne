---
description: Add today's dated grocery list to RedMart and verify delivery within three days without purchasing.
agent: build
---

Find today's grocery list in `grocery-lists/YYYY-MM-DD.md`. If that file does not exist, ask the user which list to use.

Use agent-browser to shop on RedMart. Prefer this authentication workflow because browser profile reuse is unreliable:

1. Open a visible, agent-controlled Chrome window at `https://redmart.lazada.sg`.
2. Ask the user to sign in in that window and confirm when finished. Never ask for, read, or enter their password or verification code.
3. Continue through agent-browser using the authenticated window.

Before changing the cart, inspect it and preserve unrelated items already present. Avoid adding duplicates of matching items already in the cart.

For each unchecked list entry:

- Add the closest appropriate RedMart grocery product.
- Match the requested total quantity as closely as practical, accounting for package sizes.
- Prefer ordinary, well-rated products and smaller packages when several choices are equivalent.
- Do not substitute drinks, prepared foods, or materially different ingredients for an unavailable item.
- Record any item that cannot be matched appropriately.

After adding items, verify that the complete set is available for delivery within the next three calendar days. It is permitted to select the cart and proceed to the checkout page only to inspect delivery slots. Do not reserve a slot, apply payment, or click `PLACE ORDER NOW`. Return to the cart afterward and leave the items unselected.

Report:

- The number of distinct products and total units added.
- Quantity or packaging adjustments.
- The earliest delivery date on which all carted products are available.
- Any unavailable or omitted list entries.
- Explicit confirmation that no purchase was made.

Additional user instructions: $ARGUMENTS
