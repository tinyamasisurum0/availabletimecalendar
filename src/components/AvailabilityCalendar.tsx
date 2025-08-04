'use client'

import { useState, useEffect, useRef } from 'react'
import { format, startOfWeek, addDays, addHours, setHours, isSameHour, isSameDay, addWeeks, subWeeks } from 'date-fns'
import { toZonedTime, formatInTimeZone } from 'date-fns-tz'
import html2canvas from 'html2canvas'

interface TimeSlot {
  start: Date
  end: Date
}

interface SelectedSlot {
  day: number
  hour: number
  minute: number
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)

type IntervalType = '15min' | '30min' | '1hour'

const getMinutesForInterval = (interval: IntervalType): number[] => {
  switch (interval) {
    case '15min': return [0, 15, 30, 45]
    case '30min': return [0, 30]
    case '1hour': return [0]
    default: return [0, 15, 30, 45]
  }
}
const TIMEZONE_OPTIONS = [
  // Americas
  { value: 'America/Los_Angeles', label: 'Los Angeles (GMT-8/-7)' },
  { value: 'America/Denver', label: 'Denver (GMT-7/-6)' },
  { value: 'America/Chicago', label: 'Chicago (GMT-6/-5)' },
  { value: 'America/New_York', label: 'New York (GMT-5/-4)' },
  { value: 'America/Halifax', label: 'Halifax (GMT-4/-3)' },
  { value: 'America/St_Johns', label: 'St. Johns (GMT-3:30/-2:30)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (GMT-3)' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (GMT-3)' },
  { value: 'Atlantic/Azores', label: 'Azores (GMT-1/0)' },
  
  // Europe & Africa
  { value: 'Europe/London', label: 'London (GMT+0/+1)' },
  { value: 'Europe/Paris', label: 'Paris (GMT+1/+2)' },
  { value: 'Europe/Berlin', label: 'Berlin (GMT+1/+2)' },
  { value: 'Europe/Rome', label: 'Rome (GMT+1/+2)' },
  { value: 'Europe/Athens', label: 'Athens (GMT+2/+3)' },
  { value: 'Europe/Helsinki', label: 'Helsinki (GMT+2/+3)' },
  { value: 'Europe/Istanbul', label: 'Istanbul (GMT+3)' },
  { value: 'Europe/Moscow', label: 'Moscow (GMT+3)' },
  { value: 'Africa/Cairo', label: 'Cairo (GMT+2)' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg (GMT+2)' },
  { value: 'Africa/Lagos', label: 'Lagos (GMT+1)' },
  
  // Middle East
  { value: 'Asia/Dubai', label: 'Dubai (GMT+4)' },
  { value: 'Asia/Tehran', label: 'Tehran (GMT+3:30/+4:30)' },
  { value: 'Asia/Jerusalem', label: 'Jerusalem (GMT+2/+3)' },
  
  // Asia
  { value: 'Asia/Kolkata', label: 'Mumbai/Delhi (GMT+5:30)' },
  { value: 'Asia/Dhaka', label: 'Dhaka (GMT+6)' },
  { value: 'Asia/Bangkok', label: 'Bangkok (GMT+7)' },
  { value: 'Asia/Singapore', label: 'Singapore (GMT+8)' },
  { value: 'Asia/Shanghai', label: 'Shanghai/Beijing (GMT+8)' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (GMT+8)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (GMT+9)' },
  { value: 'Asia/Seoul', label: 'Seoul (GMT+9)' },
  
  // Australia & Pacific
  { value: 'Australia/Perth', label: 'Perth (GMT+8)' },
  { value: 'Australia/Adelaide', label: 'Adelaide (GMT+9:30/+10:30)' },
  { value: 'Australia/Sydney', label: 'Sydney/Melbourne (GMT+10/+11)' },
  { value: 'Pacific/Auckland', label: 'Auckland (GMT+12/+13)' },
  { value: 'Pacific/Fiji', label: 'Fiji (GMT+12/+13)' },
  { value: 'Pacific/Honolulu', label: 'Honolulu (GMT-10)' }
]

export default function AvailabilityCalendar() {
  const [userTimezone, setUserTimezone] = useState<string>('')
  const [targetTimezone, setTargetTimezone] = useState<string>('America/New_York')
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<SelectedSlot | null>(null)
  const [is24HourFormat, setIs24HourFormat] = useState(false)
  const [intervalType, setIntervalType] = useState<IntervalType>('15min')
  const [isExporting, setIsExporting] = useState(false)
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0)
  const calendarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    setUserTimezone(detectedTimezone)
  }, [])

  const baseWeek = startOfWeek(new Date(), { weekStartsOn: 1 })
  const currentWeek = addWeeks(baseWeek, currentWeekOffset)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i))
  const MINUTES = getMinutesForInterval(intervalType)

  const isSlotSelected = (day: number, hour: number, minute: number) => {
    return selectedSlots.some(slot => slot.day === day && slot.hour === hour && slot.minute === minute)
  }

  const toggleSlot = (day: number, hour: number, minute: number) => {
    setSelectedSlots(prev => {
      const isSelected = prev.some(slot => slot.day === day && slot.hour === hour && slot.minute === minute)
      if (isSelected) {
        return prev.filter(slot => !(slot.day === day && slot.hour === hour && slot.minute === minute))
      } else {
        return [...prev, { day, hour, minute }]
      }
    })
  }

  const handleMouseDown = (day: number, hour: number, minute: number) => {
    setIsDragging(true)
    setDragStart({ day, hour, minute })
    toggleSlot(day, hour, minute)
  }

  const handleMouseEnter = (day: number, hour: number, minute: number) => {
    if (isDragging && dragStart) {
      const minDay = Math.min(dragStart.day, day)
      const maxDay = Math.max(dragStart.day, day)
      const minHour = Math.min(dragStart.hour, hour)
      const maxHour = Math.max(dragStart.hour, hour)
      const minMinute = Math.min(dragStart.minute, minute)
      const maxMinute = Math.max(dragStart.minute, minute)
      
      const newSlots: SelectedSlot[] = []
      for (let d = minDay; d <= maxDay; d++) {
        for (let h = minHour; h <= maxHour; h++) {
          for (let m of MINUTES) {
            if ((h === minHour && m >= minMinute) || (h === maxHour && m <= maxMinute) || (h > minHour && h < maxHour)) {
              newSlots.push({ day: d, hour: h, minute: m })
            }
          }
        }
      }
      setSelectedSlots(newSlots)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setDragStart(null)
  }

  const convertTimeToTargetTimezone = (day: number, hour: number, minute: number) => {
    const userDate = setHours(addHours(weekDays[day], 0), hour)
    userDate.setMinutes(minute)
    const targetDate = toZonedTime(userDate, targetTimezone)
    return targetDate
  }

  const exportAsJPEG = async () => {
    if (!calendarRef.current) return
    
    setIsExporting(true)
    
    // Small delay to let the DOM update
    await new Promise(resolve => setTimeout(resolve, 100))

    const canvas = await html2canvas(calendarRef.current, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
    })

    const link = document.createElement('a')
    link.download = `availability-${format(new Date(), 'yyyy-MM-dd')}.jpg`
    link.href = canvas.toDataURL('image/jpeg', 0.8)
    link.click()
    
    setIsExporting(false)
  }

  if (!userTimezone) {
    return <div className="text-center py-8">Detecting timezone...</div>
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 flex flex-col sm:flex-row gap-6 items-center justify-between bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Timezone
            </label>
            <div className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg text-sm font-semibold shadow-md">
              {userTimezone}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Timezone
            </label>
            <select
              value={targetTimezone}
              onChange={(e) => setTargetTimezone(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-lg text-gray-900 font-medium min-w-[240px] cursor-pointer hover:border-blue-300 transition-all duration-200 hover:shadow-xl"
            >
              {TIMEZONE_OPTIONS.map(tz => (
                <option key={tz.value} value={tz.value} className="py-2">{tz.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">12h</span>
            <button
              onClick={() => setIs24HourFormat(!is24HourFormat)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-md ${
                is24HourFormat ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-all duration-300 shadow-sm ${
                  is24HourFormat ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm font-medium text-gray-700">24h</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Interval:</span>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="interval"
                  value="15min"
                  checked={intervalType === '15min'}
                  onChange={(e) => setIntervalType(e.target.value as IntervalType)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm text-gray-700">15 min</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="interval"
                  value="30min"
                  checked={intervalType === '30min'}
                  onChange={(e) => setIntervalType(e.target.value as IntervalType)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm text-gray-700">30 min</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="interval"
                  value="1hour"
                  checked={intervalType === '1hour'}
                  onChange={(e) => setIntervalType(e.target.value as IntervalType)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm text-gray-700">1 hour</span>
              </label>
            </div>
          </div>
        </div>
        <button
          onClick={exportAsJPEG}
          disabled={selectedSlots.length === 0}
          className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
        >
          Export as JPEG
        </button>
      </div>

      <div 
        ref={calendarRef}
        className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-4 border border-white/20"
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <button
              onClick={() => setCurrentWeekOffset(Math.max(0, currentWeekOffset - 1))}
              disabled={currentWeekOffset <= 0}
              className={`p-2 rounded-lg transition-all duration-200 shadow-md ${
                currentWeekOffset <= 0
                  ? 'bg-gray-100 cursor-not-allowed opacity-50'
                  : 'bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 hover:shadow-lg'
              }`}
              aria-label="Previous week"
            >
              <svg className={`w-5 h-5 ${currentWeekOffset <= 0 ? 'text-gray-400' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-center">
              <h2 className="text-xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
                Availability for {TIMEZONE_OPTIONS.find(tz => tz.value === targetTimezone)?.label || targetTimezone}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {format(weekDays[0], 'MMM d')} - {format(weekDays[6], 'MMM d, yyyy')}
                {currentWeekOffset === 0 && ' (This Week)'}
                {currentWeekOffset === 1 && ' (Next Week)'}
                {currentWeekOffset > 1 && ` (${currentWeekOffset} weeks ahead)`}
              </p>
            </div>
            <button
              onClick={() => setCurrentWeekOffset(currentWeekOffset + 1)}
              className="p-2 rounded-lg bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 transition-all duration-200 shadow-md hover:shadow-lg"
              aria-label="Next week"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        <div className={`grid gap-1 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl overflow-hidden p-2 shadow-inner ${
          isExporting ? 'grid-cols-7' : 'grid-cols-8'
        }`}>
          {!isExporting && (
            <div className="bg-gradient-to-b from-blue-600 to-blue-700 p-3 font-bold text-white text-center rounded-lg shadow-lg">
              Your time
            </div>
          )}
          {weekDays.map((day, dayIndex) => (
            <div key={dayIndex} className="bg-gradient-to-b from-gray-700 via-gray-800 to-gray-900 p-3 text-center rounded-lg shadow-lg">
              <div className="font-bold text-white">
                {format(day, 'EEE')}
              </div>
              <div className="text-sm text-gray-300 mt-0.5">
                {format(day, 'MMM d')}
              </div>
            </div>
          ))}

          {HOURS.map(hour => (
            <div key={hour} className="contents">
              {!isExporting && (
                <div className="bg-gradient-to-b from-gray-50 to-gray-100 p-3 text-center text-sm font-bold text-gray-900 flex items-center justify-center relative border border-gray-300 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                {is24HourFormat 
                  ? `${hour.toString().padStart(2, '0')}:00`
                  : hour === 0 ? '12:00 AM' : hour < 12 ? `${hour}:00 AM` : hour === 12 ? '12:00 PM' : `${hour - 12}:00 PM`
                }
                  {!isExporting && new Date().getHours() === hour && (
                    <div className="absolute left-0 top-0 bottom-0 w-2 bg-blue-600 rounded-r"></div>
                  )}
                </div>
              )}
              {weekDays.map((day, dayIndex) => (
                <div key={`${dayIndex}-${hour}`} className={`bg-white border border-gray-200 p-0 grid gap-px rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow ${
                  intervalType === '15min' ? 'grid-rows-4' : intervalType === '30min' ? 'grid-rows-2' : 'grid-rows-1'
                }`}>
                  {MINUTES.map(minute => {
                    const isSelected = isSlotSelected(dayIndex, hour, minute)
                    const targetTime = convertTimeToTargetTimezone(dayIndex, hour, minute)
                    const currentHour = new Date().getHours()
                    const currentMinuteQuarter = Math.floor(new Date().getMinutes() / 15) * 15
                    const isCurrentTime = currentHour === hour && currentMinuteQuarter === minute
                    
                    return (
                      <div
                        key={`${dayIndex}-${hour}-${minute}`}
                        className={`cursor-pointer transition-all duration-300 select-none min-h-[36px] flex flex-col justify-center items-center border-b border-gray-100 last:border-b-0 relative ${
                          isSelected 
                            ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-lg font-semibold transform scale-105' 
                            : 'hover:bg-gradient-to-b hover:from-blue-50 hover:to-blue-100 hover:shadow-md hover:border-blue-200'
                        } ${!isExporting && isCurrentTime ? 'ring-2 ring-blue-400 ring-inset bg-blue-50' : ''}`}
                        onMouseDown={() => handleMouseDown(dayIndex, hour, minute)}
                        onMouseEnter={() => handleMouseEnter(dayIndex, hour, minute)}
                        title={`${formatInTimeZone(setHours(weekDays[dayIndex], hour), userTimezone, is24HourFormat ? 'HH:mm' : 'h:mm a').replace(':00', `:${minute.toString().padStart(2, '0')}`)} (${formatInTimeZone(targetTime, targetTimezone, is24HourFormat ? 'HH:mm' : 'h:mm a')})`}
                      >
                        <div className={`text-sm font-bold ${
                          isSelected ? 'text-white' : isCurrentTime ? 'text-blue-700' : 'text-gray-800'
                        }`}>
                          {formatInTimeZone(targetTime, targetTimezone, is24HourFormat ? 'HH:mm' : 'h:mm a')}
                        </div>
                        {!isExporting && isCurrentTime && (
                          <div className="absolute top-1 right-1 w-3 h-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full animate-pulse shadow-lg"></div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-4 text-center">
          <p className="text-gray-600 font-medium">
            ✨ Click and drag to select your available time slots
          </p>
        </div>
      </div>
    </div>
  )
}