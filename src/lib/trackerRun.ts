import { useAppStore } from '../store/appStore'
import { saveToTracker, type SaveArgs } from './tracker'

// Runs a tracker save and reflects progress in the store for the Output panel.
export async function runTrackerSave(args: SaveArgs): Promise<void> {
  useAppStore.setState({ tracker: { state: 'saving', args } })
  try {
    const result = await saveToTracker(args)
    useAppStore.setState({ tracker: { state: 'done', result, args } })
  } catch (e) {
    useAppStore.setState({
      tracker: {
        state: 'done',
        args,
        result: { ok: false, message: e instanceof Error ? e.message : 'Saving failed.' },
      },
    })
  }
}
