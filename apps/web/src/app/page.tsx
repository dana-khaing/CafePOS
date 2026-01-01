import { PRODUCT_NAME } from '@cafepos/domain'

export default function HomePage() {
  return (
    <main>
      <section className="welcome">
        <p>Foundation workspace</p>
        <h1>{PRODUCT_NAME}</h1>
        <p>The offline-first cafe and restaurant point-of-sale system is ready to build.</p>
      </section>
    </main>
  )
}
