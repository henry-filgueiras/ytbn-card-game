import { useEffect, useMemo, useState } from "react";
import {
  FILTER_OPTIONS,
  FACTION_OPTIONS,
  EFFECT_OPTIONS,
  STATUS_OPTIONS,
  SELECTOR_OPTIONS,
  TRIGGER_OPTIONS,
  formatBudgetValue,
  getAbilityBudgetSummary,
  getDraftBudgetSummary,
  cardToDraft,
  collectUsedTerms,
  createBlankCardDraft,
  createDefaultEffect,
  ensureDraftId,
  getEffectBudgetCost,
  getDraftPreview,
  getTokenOptions,
  type CardDraft,
  type SavedCardDesign,
  type TermEntry
} from "../game/designer";
import type { CardDefinition, Effect, TargetFilter } from "../game/types";
import type { TermOverrides } from "../game/text";

const DRAFT_STORAGE_KEY = "semantic-lane-duel.designer.draft";
const TERMS_STORAGE_KEY = "semantic-lane-duel.designer.terms";
const SAVED_STORAGE_KEY = "semantic-lane-duel.designer.saved";

interface CardDesignerProps {
  seedCard?: CardDefinition | null;
}

function hasTarget(effect: Effect): effect is Exclude<Effect, { kind: "summonToken" }> {
  return "target" in effect;
}

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);

  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function updateTargetFilters(filters: TargetFilter[] | undefined, filter: TargetFilter, enabled: boolean): TargetFilter[] | undefined {
  const nextFilters = new Set(filters ?? []);

  if (enabled) {
    nextFilters.add(filter);
  } else {
    nextFilters.delete(filter);
  }

  return nextFilters.size > 0 ? [...nextFilters] : undefined;
}

function getTermValue(terms: TermOverrides, entry: TermEntry): string {
  switch (entry.category) {
    case "trigger":
      return terms.triggers?.[entry.key as keyof NonNullable<TermOverrides["triggers"]>] ?? "";
    case "verb":
      return terms.verbs?.[entry.key as keyof NonNullable<TermOverrides["verbs"]>] ?? "";
    case "selector":
      return terms.selectors?.[entry.key as keyof NonNullable<TermOverrides["selectors"]>] ?? "";
    case "filter":
      return terms.filters?.[entry.key as keyof NonNullable<TermOverrides["filters"]>] ?? "";
    case "status":
      return terms.statuses?.[entry.key as keyof NonNullable<TermOverrides["statuses"]>] ?? "";
    default:
      return "";
  }
}

function setTermValue(terms: TermOverrides, entry: TermEntry, value: string): TermOverrides {
  const trimmed = value.trim();

  switch (entry.category) {
    case "trigger":
      return {
        ...terms,
        triggers: {
          ...terms.triggers,
          [entry.key]: trimmed || undefined
        }
      };
    case "verb":
      return {
        ...terms,
        verbs: {
          ...terms.verbs,
          [entry.key]: trimmed || undefined
        }
      };
    case "selector":
      return {
        ...terms,
        selectors: {
          ...terms.selectors,
          [entry.key]: trimmed || undefined
        }
      };
    case "filter":
      return {
        ...terms,
        filters: {
          ...terms.filters,
          [entry.key]: trimmed || undefined
        }
      };
    case "status":
      return {
        ...terms,
        statuses: {
          ...terms.statuses,
          [entry.key]: trimmed || undefined
        }
      };
    default:
      return terms;
  }
}

function normalizeTerms(terms: TermOverrides): TermOverrides {
  const cleanRecord = <T extends Record<string, string | undefined> | undefined>(record: T) => {
    if (!record) {
      return undefined;
    }

    const entries = Object.entries(record).filter(([, value]) => value && value.trim().length > 0);
    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
  };

  return {
    triggers: cleanRecord(terms.triggers),
    verbs: cleanRecord(terms.verbs),
    selectors: cleanRecord(terms.selectors),
    filters: cleanRecord(terms.filters),
    statuses: cleanRecord(terms.statuses)
  };
}

export function CardDesigner({ seedCard }: CardDesignerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<CardDraft>(() => readStorage(DRAFT_STORAGE_KEY, createBlankCardDraft()));
  const [termOverrides, setTermOverrides] = useState<TermOverrides>(() => readStorage(TERMS_STORAGE_KEY, {}));
  const [savedDesigns, setSavedDesigns] = useState<SavedCardDesign[]>(() => readStorage(SAVED_STORAGE_KEY, []));

  const preview = useMemo(() => getDraftPreview(ensureDraftId(draft), normalizeTerms(termOverrides)), [draft, termOverrides]);
  const usedTerms = useMemo(() => collectUsedTerms(preview.card), [preview.card]);
  const budget = useMemo(() => getDraftBudgetSummary(draft), [draft]);
  const defaultEffectCost = useMemo(() => getEffectBudgetCost(createDefaultEffect()), []);
  const defaultAbilityCost = useMemo(
    () =>
      getAbilityBudgetSummary({
        trigger: "onPlay",
        effects: [createDefaultEffect()]
      }).totalCost,
    []
  );

  useEffect(() => {
    writeStorage(DRAFT_STORAGE_KEY, draft);
  }, [draft]);

  useEffect(() => {
    writeStorage(TERMS_STORAGE_KEY, normalizeTerms(termOverrides));
  }, [termOverrides]);

  useEffect(() => {
    writeStorage(SAVED_STORAGE_KEY, savedDesigns);
  }, [savedDesigns]);

  function updateDraft(updater: (current: CardDraft) => CardDraft) {
    setDraft((current) => ensureDraftId(updater(current)));
  }

  function updateAbility(abilityIndex: number, updater: (ability: CardDraft["abilities"][number]) => CardDraft["abilities"][number]) {
    updateDraft((current) => ({
      ...current,
      abilities: current.abilities.map((ability, index) => (index === abilityIndex ? updater(ability) : ability))
    }));
  }

  function updateEffect(
    abilityIndex: number,
    effectIndex: number,
    updater: (effect: CardDraft["abilities"][number]["effects"][number]) => CardDraft["abilities"][number]["effects"][number]
  ) {
    updateAbility(abilityIndex, (ability) => ({
      ...ability,
      effects: ability.effects.map((effect, index) => (index === effectIndex ? updater(effect) : effect))
    }));
  }

  function saveCurrentDesign() {
    if (!budget.withinBudget) {
      return;
    }

    const saved: SavedCardDesign = {
      id: preview.card.id,
      card: structuredClone(preview.card),
      termOverrides: normalizeTerms(termOverrides)
    };

    setSavedDesigns((current) => {
      const withoutExisting = current.filter((entry) => entry.id !== saved.id);
      return [saved, ...withoutExisting].slice(0, 12);
    });
  }

  return (
    <section className="designer-panel surface-panel" data-surface="designer">
      <div className="section-heading">
        <h2>Card Designer</h2>
        <div className="designer-panel__header-actions">
          <span>{isOpen ? "Compose payloads and tune terms." : "Collapsed by default to keep gameplay in focus."}</span>
          <button type="button" className="secondary-button" onClick={() => setIsOpen((current) => !current)}>
            {isOpen ? "Collapse Designer" : "Open Designer"}
          </button>
        </div>
      </div>

      {!isOpen ? (
        <div className="designer-collapsed">
          <div>
            <strong>{preview.card.name}</strong>
            <div className="card-view__meta">
              {preview.card.kind === "unit" ? `${preview.card.attack}/${preview.card.health} unit` : "spell"} · cost{" "}
              {preview.card.cost} · {preview.card.id}
            </div>
          </div>
          <div className="designer-collapsed__syntax">
            {preview.canonicalRules.map((rule) => (
              <div key={rule}>{rule}</div>
            ))}
          </div>
          <div className="designer-collapsed__meta">
            <span>{usedTerms.length} semantic terms in use</span>
            <span>
              Budget {formatBudgetValue(budget.totalCost)} / {formatBudgetValue(budget.maxBudget)}
            </span>
            <span>{savedDesigns.length} saved design{savedDesigns.length === 1 ? "" : "s"}</span>
          </div>
        </div>
      ) : (
        <>
          <div className="designer-toolbar">
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                if (!seedCard) {
                  return;
                }

                setDraft(cardToDraft(seedCard));
                setTermOverrides({});
              }}
              disabled={!seedCard}
            >
              Use Inspected Card
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setDraft(createBlankCardDraft());
                setTermOverrides({});
              }}
            >
              Reset Draft
            </button>
            <button type="button" className="primary-button" onClick={saveCurrentDesign} disabled={!budget.withinBudget}>
              Save Design
            </button>
          </div>

          <div className={`designer-budget${budget.withinBudget ? "" : " is-over"}`}>
            <div className="designer-budget__summary">
              <div className="designer-budget__chip">
                <span>Cap</span>
                <strong>{formatBudgetValue(budget.maxBudget)}</strong>
              </div>
              <div className="designer-budget__chip">
                <span>Chassis</span>
                <strong>{formatBudgetValue(budget.chassisCost)}</strong>
              </div>
              <div className="designer-budget__chip">
                <span>Abilities</span>
                <strong>{formatBudgetValue(budget.abilityCost)}</strong>
              </div>
              <div className="designer-budget__chip">
                <span>{budget.withinBudget ? "Remaining" : "Over"}</span>
                <strong>{formatBudgetValue(Math.abs(budget.remainingBudget))}</strong>
              </div>
            </div>
            <div className="designer-budget__note">
              Mana cost buys build budget. Unit stats spend some of it, then every trigger/effect combination draws from the
              rest.
            </div>
            {!budget.withinBudget ? (
              <div className="designer-budget__warning">
                This draft is over budget. Raise cost, trim stats, or remove expensive effects before saving.
              </div>
            ) : null}
          </div>

          <div className="designer-grid">
            <label className="designer-field">
              <span>Card ID</span>
              <input
                value={draft.id}
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    id: event.target.value
                  }))
                }
              />
            </label>
            <label className="designer-field">
              <span>Name</span>
              <input
                value={draft.name}
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    name: event.target.value
                  }))
                }
              />
            </label>
            <label className="designer-field">
              <span>Kind</span>
              <select
                value={draft.kind}
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    kind: event.target.value as CardDraft["kind"]
                  }))
                }
              >
                <option value="unit">Unit</option>
                <option value="spell">Spell</option>
              </select>
            </label>
            <label className="designer-field">
              <span>Faction</span>
              <select
                value={draft.faction}
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    faction: event.target.value as CardDraft["faction"]
                  }))
                }
              >
                {FACTION_OPTIONS.map((faction) => (
                  <option key={faction} value={faction}>
                    {faction}
                  </option>
                ))}
              </select>
            </label>
            <label className="designer-field">
              <span>Cost</span>
              <input
                type="number"
                min={0}
                max={12}
                value={draft.cost}
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    cost: Number(event.target.value)
                  }))
                }
              />
            </label>
            {draft.kind === "unit" ? (
              <>
                <label className="designer-field">
                  <span>Attack</span>
                  <input
                    type="number"
                    min={0}
                    max={12}
                    value={draft.attack}
                    onChange={(event) =>
                      updateDraft((current) => ({
                        ...current,
                        attack: Number(event.target.value)
                      }))
                    }
                  />
                </label>
                <label className="designer-field">
                  <span>Health</span>
                  <input
                    type="number"
                    min={1}
                    max={16}
                    value={draft.health}
                    onChange={(event) =>
                      updateDraft((current) => ({
                        ...current,
                        health: Number(event.target.value)
                      }))
                    }
                  />
                </label>
              </>
            ) : null}
          </div>

          <div className="designer-section">
            <div className="designer-section__header">
              <h3>Abilities</h3>
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  updateDraft((current) => ({
                    ...current,
                    abilities: [
                      ...current.abilities,
                      {
                        trigger: "onPlay",
                        effects: [createDefaultEffect()]
                      }
                    ]
                  }))
                }
                disabled={budget.remainingBudget < defaultAbilityCost}
              >
                Add Ability ({formatBudgetValue(defaultAbilityCost)})
              </button>
            </div>

            <div className="designer-abilities">
              {draft.abilities.map((ability, abilityIndex) => (
                <article key={`ability-${abilityIndex}`} className="designer-ability">
                  <div className="designer-section__header">
                    <label className="designer-field">
                      <span>Trigger</span>
                      <select
                        value={ability.trigger}
                        onChange={(event) =>
                          updateAbility(abilityIndex, (current) => ({
                            ...current,
                            trigger: event.target.value as typeof current.trigger
                          }))
                        }
                      >
                        {TRIGGER_OPTIONS.map((trigger) => (
                          <option key={trigger} value={trigger}>
                            {trigger}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="designer-inline-actions">
                      <span className="designer-budget-pill">
                        Budget {formatBudgetValue(budget.abilities[abilityIndex]?.totalCost ?? 0)}
                      </span>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() =>
                          updateDraft((current) => ({
                            ...current,
                            abilities: current.abilities.filter((_, index) => index !== abilityIndex)
                          }))
                        }
                        disabled={draft.abilities.length === 1}
                      >
                        Remove Ability
                      </button>
                    </div>
                  </div>

                  {ability.effects.map((effect, effectIndex) => (
                    <div key={`effect-${abilityIndex}-${effectIndex}`} className="designer-effect">
                      <div className="designer-effect__header">
                        <strong>{budget.abilities[abilityIndex]?.effects[effectIndex]?.label ?? "Effect"}</strong>
                        <span className="designer-budget-pill">
                          Cost {formatBudgetValue(budget.abilities[abilityIndex]?.effects[effectIndex]?.cost ?? 0)}
                        </span>
                      </div>
                      <div className="designer-grid designer-grid--tight">
                        <label className="designer-field">
                          <span>Effect</span>
                          <select
                            value={effect.kind}
                            onChange={(event) =>
                              updateEffect(abilityIndex, effectIndex, () => createDefaultEffect(event.target.value as Effect["kind"]))
                            }
                          >
                            {EFFECT_OPTIONS.map((effectKind) => (
                              <option key={effectKind} value={effectKind}>
                                {effectKind}
                              </option>
                            ))}
                          </select>
                        </label>

                        {"amount" in effect ? (
                          <label className="designer-field">
                            <span>Amount</span>
                            <input
                              type="number"
                              value={effect.amount}
                              onChange={(event) =>
                                updateEffect(abilityIndex, effectIndex, (current) => ({
                                  ...current,
                                  amount: Number(event.target.value)
                                }))
                              }
                            />
                          </label>
                        ) : null}

                        {effect.kind === "grantStatus" ? (
                          <label className="designer-field">
                            <span>Status</span>
                            <select
                              value={effect.status}
                              onChange={(event) =>
                                updateEffect(abilityIndex, effectIndex, (current) => ({
                                  ...current,
                                  status: event.target.value as typeof effect.status
                                }))
                              }
                            >
                              {STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : null}

                        {effect.kind === "summonToken" ? (
                          <>
                            <label className="designer-field">
                              <span>Token</span>
                              <select
                                value={effect.tokenCardId}
                                onChange={(event) =>
                                  updateEffect(abilityIndex, effectIndex, (current) => ({
                                    ...current,
                                    tokenCardId: event.target.value
                                  }))
                                }
                              >
                                {getTokenOptions().map((token) => (
                                  <option key={token.id} value={token.id}>
                                    {token.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="designer-field">
                              <span>Summon Position</span>
                              <select
                                value={effect.position}
                                onChange={(event) =>
                                  updateEffect(abilityIndex, effectIndex, (current) => ({
                                    ...current,
                                    position: event.target.value as typeof effect.position
                                  }))
                                }
                              >
                                <option value="firstEmpty">First empty lane</option>
                                <option value="sameLane">Same lane</option>
                              </select>
                            </label>
                          </>
                        ) : null}

                        {hasTarget(effect) ? (
                          <label className="designer-field">
                            <span>Selector</span>
                            <select
                              value={effect.target.selector}
                              onChange={(event) =>
                                updateEffect(abilityIndex, effectIndex, (current) =>
                                  hasTarget(current)
                                    ? {
                                        ...current,
                                        target: {
                                          ...current.target,
                                          selector: event.target.value as typeof current.target.selector
                                        }
                                      }
                                    : current
                                )
                              }
                            >
                              {SELECTOR_OPTIONS.map((selector) => (
                                <option key={selector} value={selector}>
                                  {selector}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : null}
                      </div>

                      {hasTarget(effect) ? (
                        <div className="designer-filters">
                          {FILTER_OPTIONS.map((filter) => (
                            <label key={filter} className="designer-checkbox">
                              <input
                                type="checkbox"
                                checked={effect.target.filters?.includes(filter) ?? false}
                                onChange={(event) =>
                                  updateEffect(abilityIndex, effectIndex, (current) =>
                                    hasTarget(current)
                                      ? {
                                          ...current,
                                          target: {
                                            ...current.target,
                                            filters: updateTargetFilters(current.target.filters, filter, event.target.checked)
                                          }
                                        }
                                      : current
                                  )
                                }
                              />
                              <span>{filter}</span>
                            </label>
                          ))}
                        </div>
                      ) : null}

                      <div className="designer-effect__actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() =>
                            updateAbility(abilityIndex, (current) => ({
                              ...current,
                              effects: current.effects.filter((_, index) => index !== effectIndex)
                            }))
                          }
                          disabled={ability.effects.length === 1}
                        >
                          Remove Effect
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      updateAbility(abilityIndex, (current) => ({
                        ...current,
                        effects: [...current.effects, createDefaultEffect()]
                      }))
                    }
                    disabled={budget.remainingBudget < defaultEffectCost}
                  >
                    Add Effect ({formatBudgetValue(defaultEffectCost)})
                  </button>
                </article>
              ))}
            </div>
          </div>

          <div className="designer-section">
            <div className="designer-section__header">
              <h3>Term Overrides</h3>
              <span>Rename only the semantic pieces this draft actually uses.</span>
            </div>
            {usedTerms.length > 0 ? (
              <div className="designer-grid">
                {usedTerms.map((entry) => (
                  <label key={`${entry.category}-${entry.key}`} className="designer-field">
                    <span>
                      {entry.category}: {entry.label}
                    </span>
                    <input
                      placeholder={entry.label}
                      value={getTermValue(termOverrides, entry)}
                      onChange={(event) => setTermOverrides((current) => setTermValue(current, entry, event.target.value))}
                    />
                  </label>
                ))}
              </div>
            ) : (
              <div className="empty-panel">Add an ability first and the term editor will appear here.</div>
            )}
          </div>

          <div className="designer-preview-grid">
            <div className={`inspector-card faction-${preview.card.faction}`}>
              <div className="inspector-card__title">
                <div>
                  <strong>{preview.card.name}</strong>
                  <div className="inspector-card__meta">
                    {preview.card.kind === "unit" ? `${preview.card.attack}/${preview.card.health} unit` : "spell"} · cost{" "}
                    {preview.card.cost}
                  </div>
                </div>
                <span>{preview.card.faction}</span>
              </div>
              <div className="designer-preview__block">
                <strong>Canonical Syntax</strong>
                <div className="designer-preview__list">
                  {preview.canonicalRules.map((rule) => (
                    <div key={rule}>{rule}</div>
                  ))}
                </div>
              </div>
              <div className="designer-preview__block">
                <strong>Friendly Card Text</strong>
                <div className="designer-preview__list">
                  {preview.rules.map((rule) => (
                    <div key={rule}>{rule}</div>
                  ))}
                </div>
              </div>
            </div>

            <div className="designer-preview__block">
              <strong>Budget Ledger</strong>
              <div className="designer-budget-ledger">
                <div className="designer-budget-ledger__row">
                  <span>Budget cap</span>
                  <strong>{formatBudgetValue(budget.maxBudget)}</strong>
                </div>
                {draft.kind === "unit" ? (
                  <div className="designer-budget-ledger__row">
                    <span>Unit chassis</span>
                    <strong>{formatBudgetValue(budget.chassisCost)}</strong>
                  </div>
                ) : null}
                {budget.abilities.map((abilityBudget, abilityIndex) => (
                  <div key={`ability-budget-${abilityIndex}`} className="designer-budget-ledger__group">
                    <div className="designer-budget-ledger__row designer-budget-ledger__row--group">
                      <span>
                        Ability {abilityIndex + 1}: {abilityBudget.trigger}
                      </span>
                      <strong>{formatBudgetValue(abilityBudget.totalCost)}</strong>
                    </div>
                    <div className="designer-budget-ledger__row designer-budget-ledger__row--nested">
                      <span>Trigger tax</span>
                      <strong>{formatBudgetValue(abilityBudget.triggerCost)}</strong>
                    </div>
                    {abilityBudget.effects.map((effectBudget, effectIndex) => (
                      <div
                        key={`effect-budget-${abilityIndex}-${effectIndex}`}
                        className="designer-budget-ledger__row designer-budget-ledger__row--nested"
                      >
                        <span>{effectBudget.label}</span>
                        <strong>{formatBudgetValue(effectBudget.cost)}</strong>
                      </div>
                    ))}
                  </div>
                ))}
                <div className="designer-budget-ledger__row designer-budget-ledger__row--total">
                  <span>{budget.withinBudget ? "Remaining" : "Over budget"}</span>
                  <strong>{formatBudgetValue(Math.abs(budget.remainingBudget))}</strong>
                </div>
              </div>
            </div>

            <div className="designer-preview__block">
              <strong>Payload JSON</strong>
              <pre className="semantic-json">{JSON.stringify(preview.card, null, 2)}</pre>
            </div>

            <div className="designer-preview__block">
              <strong>Term Overrides JSON</strong>
              <pre className="semantic-json">{JSON.stringify(normalizeTerms(termOverrides), null, 2)}</pre>
            </div>
          </div>

          <div className="designer-section">
            <div className="designer-section__header">
              <h3>Saved Designs</h3>
              <span>Stored locally in your browser.</span>
            </div>
            {savedDesigns.length > 0 ? (
              <div className="saved-designs">
                {savedDesigns.map((design) => (
                  <div key={design.id} className="saved-design">
                    <div>
                      <strong>{design.card.name}</strong>
                      <div className="card-view__meta">{design.card.id}</div>
                    </div>
                    <div className="saved-design__actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => {
                          setDraft(cardToDraft(design.card));
                          setTermOverrides(design.termOverrides ?? {});
                        }}
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setSavedDesigns((current) => current.filter((entry) => entry.id !== design.id))}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-panel">Save a draft to keep it around between sessions.</div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
