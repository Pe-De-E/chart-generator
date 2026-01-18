import { ref, onMounted } from 'vue'

type Loader<T> = () => Promise<T>

export class AsyncResource<T> {
  data = ref<T | null>(null)
  loading = ref(false)
  error = ref<unknown | null>(null)

  private loader: Loader<T>

  constructor(loader: Loader<T>, autoLoad = true) {
    this.loader = loader

    if (autoLoad) {
      onMounted(() => this.load())
    }
  }

  async load() {
    this.loading.value = true
    this.error.value = null

    try {
      this.data.value = await this.loader()
    } catch (err) {
      this.error.value = err
      console.error(err)
    } finally {
      this.loading.value = false
    }
  }
}
