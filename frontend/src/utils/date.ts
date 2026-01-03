
/**
 * Formats a date string or Date object into the specific format:
 * DD/MM/YY, HH:MM AM/PM
 * Example: 13/01/26, 10:47 PM
 */
export const formatDateTime = (dateInput: string | Date): string => {
    if (!dateInput) return '';
    const date = new Date(dateInput);

    // Logic provided by user requirement
    return date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
};

/**
 * Formats a date string or Date object into the specific format:
 * DD/MM/YY
 * Example: 13/01/26
 */
export const formatDate = (dateInput: string | Date): string => {
    if (!dateInput) return '';
    const date = new Date(dateInput);

    return date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
    });
};

/**
 * Formats a date string or Date object into the specific time format:
 * HH:MM AM/PM
 * Example: 10:47 PM
 */
export const formatTime = (dateInput: string | Date): string => {
    if (!dateInput) return '';
    const date = new Date(dateInput);

    return date.toLocaleString("en-GB", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
};
