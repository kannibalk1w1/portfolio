import '@testing-library/jest-dom'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Auto-unmount any rendered components between tests so DOM queries don't
// see leftovers from earlier tests.
afterEach(() => cleanup())
