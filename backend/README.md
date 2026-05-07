# Romify Backend

Spring Boot + MySQL backend for the Angular travel booking MVP.

## Prerequisites

- JDK 17 or newer
- Maven
- MySQL running locally

## Database

The app uses:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/veena_travel?createDatabaseIfNotExist=true
spring.datasource.username=root
spring.datasource.password=root
```

Update `src/main/resources/application.properties` if your MySQL username or password differs.

## Email

The backend sends a welcome email after registration and a ticket email after booking. Update these properties before using email in a real account:

```properties
spring.mail.username=your-email@gmail.com
spring.mail.password=your-app-password
app.mail.from=your-email@gmail.com
```

For Gmail, use an app password instead of your normal account password.

## QR Payments

The payment page shows a UPI QR code for booking payment.

If you use Razorpay QR APIs, set your Razorpay account keys before starting the backend:

```powershell
$env:RAZORPAY_KEY_ID = 'rzp_live_xxxxxxxxxxxxxx'
$env:RAZORPAY_KEY_SECRET = 'your_live_key_secret'
mvn spring-boot:run
```

Do not commit real Razorpay secrets to `application.properties` or git.

## Run

```bash
cd backend
mvn spring-boot:run
```

On this machine you can also use:

```powershell
cd backend
.\run-backend.ps1
```

API base URL:

```text
http://localhost:8080/api
```

Seeded admin user:

```text
email: admin@romify.com
password: admin@123
```

The backend seeds sample hotels, flights, and buses on first startup.
