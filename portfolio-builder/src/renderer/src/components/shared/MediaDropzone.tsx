interface Props {
  label: string
  filters: { name: string; extensions: string[] }[]
  multiple?: boolean
  onFiles: (paths: string[]) => void
}

export function MediaDropzone({ label, filters, multiple = true, onFiles }: Props) {
  async function handleClick() {
    const paths = await window.api.openFilePicker({
      properties: multiple ? ['openFile', 'multiSelections'] : ['openFile'],
      filters,
    })
    if (paths.length) onFiles(paths)
  }

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
      style={{
        border: '2px dashed #ddd',
        borderRadius: 8,
        padding: 24,
        textAlign: 'center',
        cursor: 'pointer',
        color: '#aaa',
        fontSize: 13,
      }}
    >
      {label}
    </div>
  )
}
