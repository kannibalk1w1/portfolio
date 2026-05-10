import { usePortfolio } from '../../store/PortfolioContext'
import type { CustomSection as CustomSectionType, Section } from '../../types/portfolio'
import { RichTextEditor } from '../shared/RichTextEditor'

export function CustomSection({ section }: { section: CustomSectionType }) {
  const { state, updatePortfolio } = usePortfolio()

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>{section.title}</h2>
      <RichTextEditor
        key={section.id}
        content={section.html}
        onChange={html => updatePortfolio({
          ...state.portfolio!,
          sections: state.portfolio!.sections.map(s =>
            s.id === section.id ? { ...s, html } as Section : s
          ),
        })}
        minHeight={300}
        placeholder="Start writing…"
      />
    </div>
  )
}
