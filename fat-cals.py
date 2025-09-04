
import numpy as np
import matplotlib.pyplot as plt

def compute_rough_fat_burned_percentage(intensity_factor: float) -> float:
    a = -0.34648829
    b = -0.28680936
    c = 1.02073278
    val = a * (intensity_factor ** 2) + b * intensity_factor + c
    return max(0.0, min(1.0, val))

def fat_kcal_per_hour(power_watts: float, ftp_watts: float) -> float:
    kJ_per_hour = power_watts * 3.6
    kcal_per_hour = kJ_per_hour * (9.0/7.0)
    if_ = power_watts / ftp_watts if ftp_watts > 0 else 0.0
    fat_frac = compute_rough_fat_burned_percentage(if_)
    return kcal_per_hour * fat_frac

def carb_kcal_per_hour(power_watts: float, ftp_watts: float) -> float:
    kJ_per_hour = power_watts * 3.6
    kcal_per_hour = kJ_per_hour * (9.0/7.0)
    if_ = power_watts / ftp_watts if ftp_watts > 0 else 0.0
    carb_frac = 1 - compute_rough_fat_burned_percentage(if_)
    return kcal_per_hour * carb_frac

def compute_tss(power_watts: int, ftp_watts: int, duration_hours: float = 1.0) -> float:
    """
    Compute Training Stress Score (TSS) for a steady ride.
    
    Formula: TSS = duration_hours × (IF^2) × 100
    where IF = power / FTP
    """
    if ftp_watts <= 0:
        return 0.0
    IF = power_watts / ftp_watts
    return duration_hours * (IF ** 2) * 100


FTP = 212.0

powers = np.arange(0, int(FTP * 1.5)+1, 1, dtype=float)
fat_kcal = np.array([fat_kcal_per_hour(p, FTP) for p in powers])
carb_kcal = np.array([carb_kcal_per_hour(p, FTP) for p in powers])
total_kcal = fat_kcal + carb_kcal

tss = np.array([compute_tss(p, FTP) for p in powers])
calories_per_tss = total_kcal / tss

max_idx = int(np.argmax(fat_kcal))
max_power = powers[max_idx]
max_fat_kcal = fat_kcal[max_idx]
m_carb_kcal = carb_kcal[max_idx]
print(f"Max fat calories/hour ≈ {max_fat_kcal:.1f} kcal/h at {max_power:.0f} W "
      f"(IF={max_power/FTP:.2f})")
print(f"carb calories/hour at fatmax ≈ {m_carb_kcal:.1f} kcal/h at {max_power:.0f} W "
      f"(IF={max_power/FTP:.2f})")

fat20 = fat_kcal[max_idx + 20]
carb20 = carb_kcal[max_idx + 20]
cal20 = fat20 + carb20
print(f"Fat calories/hour at fatmax+20W ≈ {fat20:.1f} kcal/h at {max_power+20:.0f} W ")
print(f"carb calories/hour at fatmax+20W ≈ {carb20:.1f} kcal/h at {max_power+20:.0f} W ")
print(f"Total calories/hour at fatmax+20W ≈ {cal20:.1f} kcal/h at {max_power+20:.0f} W ")

plt.figure()
plt.plot(powers, fat_kcal)
plt.plot(powers, carb_kcal)
plt.plot(powers, total_kcal, linestyle='dashed')
# plt.plot(powers, tss, linestyle='dotted')
# plt.plot(powers, calories_per_tss, linestyle='dashdot')
plt.xlabel("Power (W)")
plt.ylabel("Fat calories burned per hour (kcal/h)")
plt.title("Estimated Fat Calories per Hour vs Power (FTP = 212 W)")
plt.grid(True)
plt.show()
