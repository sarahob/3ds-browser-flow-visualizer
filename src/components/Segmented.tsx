/**
 * A segmented control built from native radio buttons: one Tab stop, arrow keys move between
 * options, and the browser does the rest. Used for the path chips and the variant switch.
 */
export function Segmented<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  size = 'md',
}: {
  legend: string
  name: string
  options: { value: T; label: string }[]
  /** The chosen option; none is chosen when undefined. */
  value: T | undefined
  /** Called once per activation, including a click on the option that is already chosen. */
  onChange: (v: T) => void
  size?: 'md' | 'sm'
}) {
  return (
    <fieldset className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
      <legend className="sr-only">{legend}</legend>
      {options.map((o) => (
        <label key={o.value} className="relative">
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={o.value === value}
            // click covers the mouse, Space and arrow keys (browsers fire it when a radio is chosen
            // with the keyboard), and also a click on the option that is already chosen
            onClick={() => onChange(o.value)}
            readOnly
            className="peer sr-only"
          />
          <span
            className={`block cursor-pointer whitespace-nowrap rounded-md font-medium transition ${
              size === 'md' ? 'px-2.5 py-1.5 text-sm' : 'px-2.5 py-1 text-xs'
            } text-slate-600 hover:text-slate-900 peer-checked:bg-white peer-checked:text-indigo-700 peer-checked:shadow-sm peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-indigo-600 dark:text-slate-300 dark:hover:text-white dark:peer-checked:bg-slate-700 dark:peer-checked:text-white dark:peer-focus-visible:outline-indigo-400`}
          >
            {o.label}
          </span>
        </label>
      ))}
    </fieldset>
  )
}
