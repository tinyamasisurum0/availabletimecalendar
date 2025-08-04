import AvailabilityCalendar from '@/components/AvailabilityCalendar'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Available Time Calendar
        </h1>
        <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto text-lg leading-relaxed">
          Select your available times and generate a shareable calendar image for your target timezone
        </p>
        <AvailabilityCalendar />
      </div>
    </main>
  )
}
