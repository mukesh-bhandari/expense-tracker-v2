import type { FC } from 'react'
import { NepaliDatePicker as BaseNepaliDatePicker } from 'nepali-datepicker-reactjs'

export interface NepaliDatePickerProps {
  value: string
  onChange: (date: string) => void
  placeholder?: string
  inputClassName?: string
  className?: string
  options?: {
    calenderLocale?: 'en' | 'ne'
    valueLocale?: 'en' | 'ne'
    closeOnSelect?: boolean
  }
}

const Base = BaseNepaliDatePicker as unknown as FC<NepaliDatePickerProps>

export function NepaliDatePicker(props: NepaliDatePickerProps) {
  return <Base {...props} />
}

export default NepaliDatePicker
