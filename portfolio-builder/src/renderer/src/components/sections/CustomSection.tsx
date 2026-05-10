import { usePortfolio } from '../../store/PortfolioContext'
import type { CustomSection as CustomSectionType, Section } from '../../types/portfolio'
import { RichTextEditor } from '../shared/RichTextEditor'
import { SectionTitle } from '../shared/SectionTitle'
import { useImageInserter } from '../../hooks/useImageInserter'

export function CustomSection({ section }: { section: CustomSectionType }) {
  const { state, updatePortfolio } = usePortfolio()
  const onInsertImage = useImageInserter()

  function updateSection(patch: Partial<CustomSectionType>) {
    updatePortfolio({
      ...state.portfolio!,
      sections: state.portfolio!.sections.map(s =>
        s.id === section.id ? { ...s, ...patch } as Section : s
      ),
    })
  }

  return (
    <div>
      <SectionTitle title={section.title} onChange={title => updateSection({ title })} />
      <RichTextEditor
        key={section.id}
        content={section.html}
        onChange={html => updateSection({ html })}
        minHeight={300}
        placeholder="Start writing…"
        onInsertImage={onInsertImage}
      />
    </div>
  )
}
