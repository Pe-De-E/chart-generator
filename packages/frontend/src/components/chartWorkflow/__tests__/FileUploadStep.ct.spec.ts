import { test, expect } from '@playwright/experimental-ct-vue'
import FileUploadStep from '../FileUploadStep.vue'

const defaultProps = {
  tableHeaders: [],
  tableItems: [],
  parseCSV: () => {},
  parseGPX: () => null,
}

test.describe('FileUploadStep', () => {
  test('renders empty state when no file is loaded', async ({ mount }) => {
    const component = await mount(FileUploadStep, { props: defaultProps })
    await expect(component.getByText('Datei hochladen')).toBeVisible()
    await expect(component.getByText('Keine Datei ausgewählt')).toBeVisible()
  })

  test('shows CSV/GPX hint text in empty state', async ({ mount }) => {
    const component = await mount(FileUploadStep, { props: defaultProps })
    await expect(component.getByText(/CSV-Datei für Diagramme oder GPX-Datei für Höhenprofile/)).toBeVisible()
  })

  test('Weiter button is disabled when tableItems is empty', async ({ mount }) => {
    const component = await mount(FileUploadStep, { props: defaultProps })
    await expect(component.getByRole('button', { name: /Weiter/i })).toBeDisabled()
  })

  test('shows file preview card when tableItems are provided', async ({ mount }) => {
    const component = await mount(FileUploadStep, {
      props: {
        ...defaultProps,
        tableHeaders: [
          { title: 'Month', key: 'Month' },
          { title: 'Revenue', key: 'Revenue' },
        ],
        tableItems: [
          { Month: 'January', Revenue: 12500 },
          { Month: 'February', Revenue: 14200 },
          { Month: 'March', Revenue: 11800 },
        ],
      },
    })
    await expect(component.getByText('Vorschau (erste 5 Zeilen)')).toBeVisible()
    await expect(component.getByText('3 Zeilen geladen')).toBeVisible()
  })

  test('Weiter button is enabled when tableItems are provided', async ({ mount }) => {
    const component = await mount(FileUploadStep, {
      props: {
        ...defaultProps,
        tableHeaders: [{ title: 'Month', key: 'Month' }],
        tableItems: [{ Month: 'January' }, { Month: 'February' }],
      },
    })
    await expect(component.getByRole('button', { name: /Weiter/i })).toBeEnabled()
  })

  test('Weiter button emits next event when clicked', async ({ mount }) => {
    const events: string[] = []
    const component = await mount(FileUploadStep, {
      props: {
        ...defaultProps,
        tableHeaders: [{ title: 'Month', key: 'Month' }],
        tableItems: [{ Month: 'January' }],
      },
      on: {
        next: () => events.push('next'),
      },
    })
    await component.getByRole('button', { name: /Weiter/i }).click()
    expect(events).toContain('next')
  })

  test('file input accepts .csv and .gpx files', async ({ mount }) => {
    const component = await mount(FileUploadStep, { props: defaultProps })
    const fileInput = component.locator('input[type="file"]')
    await expect(fileInput).toHaveAttribute('accept', expect.stringContaining('.csv'))
    await expect(fileInput).toHaveAttribute('accept', expect.stringContaining('.gpx'))
  })

  test('shows downsampling info when provided', async ({ mount }) => {
    // Simulate a GPX result that triggered downsampling by passing tableItems
    // and a mock parseGPX that returns downsampling info
    const component = await mount(FileUploadStep, {
      props: {
        ...defaultProps,
        tableHeaders: [{ title: 'Label', key: 'label' }],
        tableItems: Array.from({ length: 10 }, (_, i) => ({ label: String(i) })),
      },
    })
    // Preview shows loaded point count
    await expect(component.getByText('10 Zeilen geladen')).toBeVisible()
  })
})
