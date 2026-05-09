declare namespace JSX {
  interface IntrinsicElements {
    'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      src?: string
      alt?: string
      'auto-rotate'?: boolean | string
      'camera-controls'?: boolean | string
      poster?: string
      style?: React.CSSProperties
    }
  }
}
