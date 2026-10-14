/**
 * Material Symbols ikonu.
 * <Icon name="play_arrow" filled className="text-[20px]" />
 */
export default function Icon({ name, filled = false, className = "" }) {
    return (
        <span aria-hidden="true" className={`material-symbols-outlined ${filled ? "icon-fill" : ""} ${className}`}>
            {name}
        </span>
    );
}
