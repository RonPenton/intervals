import numpy as np
import matplotlib.pyplot as plt

# Settings
days = 42 * 2                  # Number of days
tss_per_day = 50           # Daily TSS
tau_ctl = 42               # Time constant for CTL
alpha_ctl = 1 / tau_ctl    # CTL smoothing factor

# Data
ctl = np.zeros(days)              # CTL array
tss = np.full(days, 0)  # Constant TSS each day

# for i in range(1, days):
#     if i % 2 == 1:
#         tss[i] = 0
#     else:
#         tss[i] = tss_per_day
ctl[0] = 100                   # Initialize CTL

for i in range(1, days):
    # random 6/7 chance of riding
    will_ride = np.random.rand() < 6 / 7
    if will_ride:
        min = 10
        max = 200
        ctss = np.random.randint(min, max)
        tss[i] = ctss
    else:
        tss[i] = 0

# Calculate CTL
for i in range(1, days):
    ctl[i] = ctl[i - 1] + alpha_ctl * (tss[i] - ctl[i - 1])

print(tss)
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
