## Why the change

The eight inventory filters were laid out with `flex-wrap` of fixed-width fields, so the second row never lined up under the first and the bar looked misaligned; this puts them on a proper column grid behind a "Filters" disclosure so the common controls stay visible and the rest line up when opened.

## Special things to note

- The six advanced filters now live inside a collapsible panel, so Base UI hides them from the DOM when closed. The shared `chooseFilter` test helper opens the "Filters" disclosure before picking an option, matching what a real user does; one test that asserts the Area filter is disabled opens it the same way.
- The panel's open state is controlled (`useState`), seeded once from whether a filter is already set. A returning user with active filters sees the panel open; otherwise it starts closed. This also avoids Base UI's uncontrolled "default open changed" warning.
- "Status" stays a native `<select>` while the six advanced filters are searchable multi-selects. The inconsistency is unchanged by this PR and left for a follow-up.

## Change outline

```task-artifact
.humanlayer/tasks/inventory-filters-disclosure/show-me-before-after.html
```

Component tree: the flat filter bar becomes a disclosure with a header row and a grid panel.

```diff
 <TechStackTable>
-  <div header row: title + total + AssetFilterBar (justify-between)>
+  <div header column: title + total>
+    <AssetFilterBar>              own full-width row below the title

 <AssetFilterBar>
-  <div role=group className="flex flex-wrap gap-4">     every field 256px, Status narrower
-    <FilterSelect Status> <FilterMultiSelect ×7>
+  <Collapsible.Root open={open} onOpenChange={setOpen}>  open seeded from countActive > 0
+    <header className="flex items-end gap-3">
+      <FilterSelect Status>                              w-44
+      <Collapsible.Trigger>  "Filters" / "Filters · N" + chevron
+      {activeCount > 0 && <button onClick={clearAdvanced}>Clear</button>}
+    <Collapsible.Panel>                                  animates --collapsible-panel-height + opacity
+      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
+        <FilterMultiSelect ×6>                           Kind, Criticality, Exposure, Classification, Lifecycle, Area
```

Field width: the multi-select fills its grid cell instead of a fixed 256px.

```diff
 // FilterMultiSelect.tsx
-<div className="flex w-64 max-w-full flex-col gap-1">
+<div className="flex w-full min-w-0 flex-col gap-1">
```

New helper deciding the trigger label and what "Clear" resets.

```diff
+countActive(filters)      // sum of the six advanced filter arrays; Status is not counted
+clearAdvanced()           // empties the six arrays, keeps filters.active (Status)
```

Shallow file tree of what changed.

```diff
 src/
 ├── pages/Config/
 │   ├── TechStackTable.tsx      # filter bar moved to its own full-width row
 │   ├── AssetFilterBar.tsx      # flat flex bar -> header + Collapsible grid panel
 │   └── FilterMultiSelect.tsx   # fixed 256px -> fills its grid cell
 ├── i18n/locales/
 │   ├── en.ts                   # more / moreActive / clear / panelLabel keys
 │   └── es.ts                   # same keys in Spanish
 └── test/
     └── filters.ts              # chooseFilter opens the disclosure first
```
