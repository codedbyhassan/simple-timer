import { forwardRef, useId, useState } from 'react'
import Icon from '../icons/Icon.jsx'
import IconButton from './IconButton.jsx'
import './textfield.css'

export const TextField = forwardRef(function TextField(
  { label, hint, error, icon, trailing, id, ...input },
  ref,
) {
  const auto = useId()
  const fieldId = id || auto
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined
  return (
    <div className="hms-field">
      <label className="hms-field__label" htmlFor={fieldId}>{label}</label>
      <div className={`hms-field__control${error ? ' has-error' : ''}`}>
        {icon ? <span className="hms-field__icon"><Icon name={icon} size={18} /></span> : null}
        <input
          ref={ref}
          id={fieldId}
          className={`hms-field__input${icon ? ' has-icon' : ''}${trailing ? ' has-trailing' : ''}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...input}
        />
        {trailing ? <span className="hms-field__trailing">{trailing}</span> : null}
      </div>
      {error ? (
        <p className="hms-field__error" id={`${fieldId}-error`}><Icon name="xCircle" size={15} />{error}</p>
      ) : hint ? (
        <p className="hms-field__hint" id={`${fieldId}-hint`}>{hint}</p>
      ) : null}
    </div>
  )
})

export const PasswordField = forwardRef(function PasswordField({ onKeyUp, onBlur, hint, ...rest }, ref) {
  const [shown, setShown] = useState(false)
  const [caps, setCaps] = useState(false)
  return (
    <TextField
      ref={ref}
      type={shown ? 'text' : 'password'}
      icon="lock"
      hint={caps ? 'Caps Lock is on.' : hint}
      onKeyUp={(e) => { setCaps(e.getModifierState && e.getModifierState('CapsLock')); onKeyUp?.(e) }}
      onBlur={(e) => { setCaps(false); onBlur?.(e) }}
      trailing={
        <IconButton size="sm" label={shown ? 'Hide password' : 'Show password'} onClick={() => setShown((v) => !v)} aria-pressed={shown}>
          <Icon name={shown ? 'eyeOff' : 'eye'} size={18} />
        </IconButton>
      }
      {...rest}
    />
  )
})
