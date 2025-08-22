import numpy as np
import matplotlib.pyplot as plt

# Assume a 1-hour ride
duration_hours = 1  

# Intensity Factor (IF) from 0 to 1
IF = np.linspace(0, 1, 100)

# TSS formula for a 1-hour ride:
# TSS = duration_hours × IF^2 × 100
TSS = duration_hours * (IF**2) * 100

# Plot
plt.figure(figsize=(8,6))
plt.plot(IF, TSS, label="TSS vs Intensity Factor", linewidth=2)
plt.title("Training Stress Score (TSS) vs Intensity Factor (IF)")
plt.xlabel("Intensity Factor (IF)")
plt.ylabel("TSS (1 hour ride)")
plt.xticks(np.arange(0, 1.1, 0.1))
plt.yticks(np.arange(0, 101, 10))
plt.grid(True)
plt.legend()
plt.show()
