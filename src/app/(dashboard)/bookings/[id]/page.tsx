export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <div className="p-8">
      <h1 className="text-2xl font-medium mb-2">Booking #{id}</h1>
      <p className="text-muted-foreground">
        Booking timeline, charges, payments, and handover records will be built here.
      </p>
    </div>
  )
}
