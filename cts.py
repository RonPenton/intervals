import numpy as np
import matplotlib.pyplot as plt

# Settings
days = 42                  # Number of days
tss_per_day = 50           # Daily TSS
tau_ctl = 42               # Time constant for CTL
alpha_ctl = 1 / tau_ctl    # CTL smoothing factor

# Data
ctl = np.zeros(days)              # CTL array
tss = np.full(days, tss_per_day)  # Constant TSS each day

for i in range(1, days):
    if i % 2 == 1:
        tss[i] = 0
    else:
        tss[i] = tss_per_day
ctl[0] = tss[0]                   # Initialize CTL

# Calculate CTL
for i in range(1, days):
    ctl[i] = ctl[i - 1] + alpha_ctl * (tss[i] - ctl[i - 1])

print(ctl)

# Plotting
plt.figure(figsize=(10, 5))
plt.plot(range(1, days + 1), ctl, label='CTL', marker='o')
plt.axhline(y=tss_per_day, color='gray', linestyle='--', label='Target TSS (50)')
plt.title("CTL Over 42 Days at 50 TSS/day")
plt.xlabel("Day")
plt.ylabel("CTL")
plt.legend()
plt.grid(True)
plt.tight_layout()
plt.show()
