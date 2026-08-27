export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <div className="p-8">
      <h1 className="text-2xl font-medium mb-2">Vehicle #{id}</h1>
      <p className="text-muted-foreground">
        Vehicle profile, booking history, maintenance log, and documents will be built here.
      </p>
    </div>
  )
}
