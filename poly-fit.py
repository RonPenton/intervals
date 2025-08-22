import numpy as np
import matplotlib.pyplot as plt

x = np.array([0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 
              0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0, 1.05, 1.1, 
              1.15, 1.2, 1.25, 1.3])
y = np.array([0.97, 0.95, 0.93, 0.90, 0.88, 0.85, 0.82, 0.79, 0.76, 0.72, 
              0.69, 0.65, 0.61, 0.57, 0.53, 0.48, 0.43, 0.39, 0.34, 0.29, 
              0.23, 0.18, 0.12, 0.06])


coeffs = np.polyfit(x, y, 2)
poly = np.poly1d(coeffs)
x_fit = np.linspace(min(x), max(x), 100)
y_fit = poly(x_fit)

plt.figure(figsize=(8,6))
plt.scatter(x, y, color='blue', label='Data')
plt.plot(x_fit, y_fit, 'r-', label=f'Fit: {coeffs[0]:.4f}x² {coeffs[1]:+.4f}x {coeffs[2]:+.4f}')
plt.xlabel("x")
plt.ylabel("y")
plt.title("2nd Order Polynomial Fit")
plt.legend()
plt.grid(True)
plt.show()

print(f"Polynomial coefficients: {coeffs}")