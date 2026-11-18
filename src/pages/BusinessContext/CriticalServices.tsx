import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { LIMITS, useAssetNamesQuery, type BusinessContextFields } from '../../api/businessContext'
import { CloseIcon } from '../../components/ui/icons'
import { EMPTY } from '../../i18n/format'
import { SelectField, TextField } from './fields'
import { useMeta } from './meta'
import { TagField } from './TagField'
import { useVocab } from './vocab'

export function CriticalServices() {
  const { t } = useTranslation()
  const { suggested, readOnly } = useMeta('operations.critical_services')
  const { control } = useFormContext<BusinessContextFields>()
  const { fields, append, remove } = useFieldArray({ control, name: 'operations.critical_services' })
  const assetNames = useAssetNamesQuery()

  return (
    <div className={`flex flex-col gap-2 ${suggested ? '-ml-3 border-l-2 border-cyan pl-[10px]' : ''}`}>
      <span className={`font-body font-semibold ${readOnly ? 'text-[0.8125rem] text-gray' : 'text-[0.875rem] text-navy'}`}>
        {t('businessContext.fields.criticalServices.label')}
      </span>
      {readOnly && fields.length === 0 && <p className="font-body text-[0.9375rem] text-muted-bg">{EMPTY}</p>}
      {fields.map((item, index) =>
        readOnly ? (
          <ShownService key={item.id} index={index} />
        ) : (
          <div key={item.id} className="flex items-start gap-3 rounded-lg border border-border-panel p-3">
            <div className="grid min-w-0 flex-1 gap-2 md:grid-cols-4">
              <div className="md:col-span-2">
                <TextField
                  name={`operations.critical_services.${index}.name`}
                  label={t('businessContext.fields.criticalServices.name')}
                  placeholder={t('businessContext.fields.criticalServices.namePlaceholder')}
                  max={LIMITS.entry}
                  hideLabel
                  className="font-semibold"
                />
              </div>
              <div className="md:col-span-2">
                <TagField
                  name={`operations.critical_services.${index}.assets`}
                  label={t('businessContext.fields.criticalServices.assets')}
                  placeholder={t('businessContext.fields.criticalServices.assetsPlaceholder')}
                  suggestions={assetNames.data}
                  hideLabel
                />
              </div>
              <div className="md:col-span-2">
                <TextField
                  name={`operations.critical_services.${index}.description`}
                  label={t('businessContext.fields.criticalServices.description')}
                  placeholder={t('businessContext.fields.criticalServices.descriptionPlaceholder')}
                  max={LIMITS.statement}
                  hideLabel
                />
              </div>
              <SelectField
                name={`operations.critical_services.${index}.impact`}
                vocab="impact"
                label={t('businessContext.fields.criticalServices.impact')}
                emptyLabel={t('businessContext.fields.criticalServices.impactPlaceholder')}
                hideLabel
              />
              <SelectField
                name={`operations.critical_services.${index}.max_downtime`}
                vocab="downtime"
                label={t('businessContext.fields.criticalServices.maxDowntime')}
                emptyLabel={t('businessContext.fields.criticalServices.maxDowntimePlaceholder')}
                hideLabel
              />
            </div>
            <button
              type="button"
              aria-label={t('businessContext.fields.criticalServices.remove')}
              onClick={() => remove(index)}
              className="mt-2.5 flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-gray hover:bg-panel hover:text-critical focus-ring"
            >
              <CloseIcon size={12} />
            </button>
          </div>
        ),
      )}
      {!readOnly && fields.length < LIMITS.services && (
        <button
          type="button"
          onClick={() => append({ name: '', description: '', impact: '', max_downtime: '', assets: [] })}
          className="cursor-pointer rounded-lg border border-dashed border-muted-bg py-3 font-body text-[0.875rem] font-semibold text-gray transition-colors hover:border-navy hover:text-navy focus-ring"
        >
          + {t('businessContext.fields.criticalServices.add')}
        </button>
      )}
    </div>
  )
}

function ShownService({ index }: { index: number }) {
  const { control } = useFormContext<BusinessContextFields>()
  const service = useWatch({ control, name: `operations.critical_services.${index}` })
  const impactName = useVocab('impact').labelOf
  const downtimeName = useVocab('downtime').labelOf
  const tolerance = [
    service.impact && impactName(service.impact),
    service.max_downtime && downtimeName(service.max_downtime),
  ].filter(Boolean)
  return (
    <div className="flex flex-col gap-0.5">
      <p className="font-body text-[0.9375rem] font-semibold text-navy">{service.name}</p>
      {service.description && <p className="font-body text-[0.875rem] text-navy">{service.description}</p>}
      {tolerance.length > 0 && <p className="font-body text-[0.8125rem] text-gray">{tolerance.join(' · ')}</p>}
      {service.assets.length > 0 && <p className="font-mono text-[0.75rem] text-gray">{service.assets.join(' · ')}</p>}
    </div>
  )
}
