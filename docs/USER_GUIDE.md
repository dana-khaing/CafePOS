# CafePOS user guide

This guide explains how front-of-house staff, managers, and owners use CafePOS
day to day.

## What the app does

CafePOS is split into a few working areas:

- Orders: create new tickets, add products, and send orders to the kitchen.
- Menu: add or edit items, categories, and availability.
- Inventory: adjust stock with manager approval.
- History: review completed sales and completed receipts.
- Shifts: track cash and shift activity.
- Kitchen: view active preparation work.
- Reports: review sales and operational summaries.
- Backup & recovery: manage local backup and restore workflows.
- Settings: change local preferences and branch configuration.

## First things to check

When the app opens, confirm:

- the branch name in the header is correct;
- the app is connected to the branch hub;
- the correct language is selected;
- the menu items on the order screen match the current store setup.

If the menu looks wrong, open the Menu page and refresh the catalog data.

## Taking an order

1. Open Orders.
2. Choose the service mode:
   - Counter
   - Takeaway
   - Table
3. Pick a category or search for the item.
4. Open the product card.
5. Choose any required modifiers such as size or milk.
6. Click Add to order.
7. Review the right-hand order panel.
8. Change quantities with the plus and minus buttons.
9. Click Submit order.

If the order is a table order, enter the table number before submitting.

## How menu management works

The Menu page is where a manager keeps the catalog up to date.

### Add a category

1. Open Menu.
2. In the Category editor, enter:
   - category id
   - English name
   - Thai name, if needed
   - sort order
3. Click Save category.

Use a short stable id such as `coffee`, `tea`, or `bakery`.

### Edit a category

1. Find the category chip below the editor.
2. Click the pencil icon.
3. Update the values.
4. Click Update category.

### Remove a category

1. Find the category chip.
2. Click the trash icon.
3. The app only allows deletion if no menu items still use that category.

### Add a menu item

1. Open Menu.
2. In the Menu item editor, enter:
   - item id
   - SKU
   - category
   - price
   - English name
   - Thai name, if needed
   - tax rate id
   - availability
   - modifier groups
3. Click Save item.

Example:

- item id: `latte`
- SKU: `COF-LAT`
- category: `coffee`
- price: `12000`
- tax rate id: `vat7`

### Edit a menu item

1. Find the item in the catalog preview.
2. Click Edit.
3. Update the fields.
4. Click Update item.

### Change availability

Use the availability button on each item card to mark it available or unavailable.
Unavailable items stay in the catalog but cannot be sold from the order screen.

### Modifier groups

Modifier groups let you define choices such as:

- size
- milk type
- add-ons

The order screen uses the groups already attached to an item.
If you add a new item, attach the correct modifier groups before saving.

## How inventory management works

The Inventory page is for stock corrections and manual stock count changes.

### Adjust stock

1. Open Inventory.
2. Select the stock item.
3. Enter the quantity change.
   - Use a negative number to reduce stock.
   - Use a positive number to add stock.
4. Enter the reason.
5. Enter the manager PIN.
6. Confirm the change.

Examples:

- `+20` for new deliveries
- `-3` for spoilage
- `-1` for staff use

### When to use inventory adjustments

Use inventory adjustments when:

- stock is delivered;
- an item is wasted or spoiled;
- a stock count is corrected after physical counting;
- the manager wants to reconcile the local stock ledger.

## History and refunds

Open History to review completed sales.

Use a refund only when the receipt is correct and the manager approves it.
Refund approval is controlled separately from the branch onboarding credentials.

## Shifts

Open Shifts to check the current shift state and cash activity.

Use this page to:

- open or close a shift;
- review transactions tied to the shift;
- reconcile cash before handover.

## Kitchen

The Kitchen screen is for active preparation work.

Use it to:

- see which items are waiting;
- track work in progress;
- confirm what has been sent from the register.

## Backup and recovery

Use Backup & recovery when you need to:

- make a local backup;
- restore data after a device issue;
- verify the branch has a recoverable copy of data.

Backups should be checked before any production go-live.

## Settings

Settings are for branch-level configuration such as:

- language preference;
- display behavior;
- operational flags;
- connected branch settings.

If you change branch credentials or hub settings, do it carefully and record the change.

## Common operational flow

For a normal shift:

1. Confirm the hub connection.
2. Check the menu items and inventory levels.
3. Take orders.
4. Send them to the kitchen.
5. Review completed sales in History.
6. Close the shift.
7. Back up the data if required by store policy.

## If something looks wrong

- No menu items: check the Menu page and the branch storage.
- Wrong prices: verify the menu item price and modifier prices.
- Inventory mismatch: do a manual stock count and adjust the item.
- Orders not submitting: check branch connectivity and local storage status.
