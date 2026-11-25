import math

def number_to_indian_words(num):
    """
    Converts a number to Indian currency format words (Lakhs, Crores).
    E.g. 54320 -> Fifty Four Thousand Three Hundred Twenty Rupees Only
    """
    if num is None:
        return "Zero Rupees Only"
    
    amount = round(float(num), 2)
    rupees = int(amount)
    paise = int(round((amount - rupees) * 100))

    units = [
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
        "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
        "Seventeen", "Eighteen", "Nineteen"
    ]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

    def convert_upto_999(n):
        res = ""
        hundreds = n // 100
        rem = n % 100
        if hundreds > 0:
            res += units[hundreds] + " Hundred "
        if rem > 0:
            if rem < 20:
                res += units[rem] + " "
            else:
                res += tens[rem // 10] + (" " + units[rem % 10] if rem % 10 != 0 else "") + " "
        return res.strip()

    if rupees == 0:
        words = "Zero Rupees"
    else:
        words = ""
        crore = rupees // 10000000
        rem_crore = rupees % 10000000
        
        lakh = rem_crore // 100000
        rem_lakh = rem_crore % 100000
        
        thousand = rem_lakh // 1000
        rem_thousand = rem_lakh % 1000
        
        if crore > 0:
            words += convert_upto_999(crore) + " Crore "
        if lakh > 0:
            words += convert_upto_999(lakh) + " Lakh "
        if thousand > 0:
            words += convert_upto_999(thousand) + " Thousand "
        if rem_thousand > 0:
            words += convert_upto_999(rem_thousand) + " "
        
        words = words.strip() + " Rupees"

    if paise > 0:
        words += " and " + convert_upto_999(paise) + " Paise"
    
    return words + " Only"

def mask_sensitive(val, visible_chars=4):
    if not val:
        return ""
    val_str = str(val).strip()
    if len(val_str) <= visible_chars:
        return "*" * len(val_str)
    return "*" * (len(val_str) - visible_chars) + val_str[-visible_chars:]
