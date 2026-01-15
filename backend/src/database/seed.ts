import { postgresClient } from "./postgres";

async function seedDatabase(): Promise<void> {
    console.log("Seeding database...");

    try {
        // Seed Customers
        await postgresClient.query(`
      INSERT INTO customers (id, name, phone, email) VALUES
        ('11111111-1111-1111-1111-111111111111', 'John Doe', '+1234567890', 'john@example.com'),
        ('22222222-2222-2222-2222-222222222222', 'Jane Smith', '+1234567891', 'jane@example.com'),
        ('33333333-3333-3333-3333-333333333333', 'Bob Wilson', '+1234567892', 'bob@example.com')
      ON CONFLICT (id) DO NOTHING;
    `);

        // Seed Restaurants
        await postgresClient.query(`
      INSERT INTO restaurants (id, name, phone, street, city, state, zip_code, latitude, longitude) VALUES
        ('aaaa1111-1111-1111-1111-111111111111', 'Pizza Palace', '+1111111111', '123 Main St', 'New York', 'NY', '10001', 40.7128, -74.0060),
        ('bbbb2222-2222-2222-2222-222222222222', 'Burger Barn', '+2222222222', '456 Oak Ave', 'New York', 'NY', '10002', 40.7580, -73.9855),
        ('cccc3333-3333-3333-3333-333333333333', 'Sushi Station', '+3333333333', '789 Elm Blvd', 'New York', 'NY', '10003', 40.7489, -73.9680)
      ON CONFLICT (id) DO NOTHING;
    `);

        // Seed Riders (using valid hex UUIDs)
        await postgresClient.query(`
      INSERT INTO riders (id, name, phone, email, vehicle_type, status) VALUES
        ('d1d1d1d1-1111-1111-1111-111111111111', 'Mike Rider', '+5551111111', 'mike@riders.com', 'motorcycle', 'offline'),
        ('d2d2d2d2-2222-2222-2222-222222222222', 'Sarah Driver', '+5552222222', 'sarah@riders.com', 'bicycle', 'offline'),
        ('d3d3d3d3-3333-3333-3333-333333333333', 'Tom Courier', '+5553333333', 'tom@riders.com', 'car', 'offline')
      ON CONFLICT (id) DO NOTHING;
    `);

        console.log("Database seeded successfully!");
        console.log("\nSeeded IDs:");
        console.log("Customers:");
        console.log("  - 11111111-1111-1111-1111-111111111111 (John Doe)");
        console.log("  - 22222222-2222-2222-2222-222222222222 (Jane Smith)");
        console.log("  - 33333333-3333-3333-3333-333333333333 (Bob Wilson)");
        console.log("Restaurants:");
        console.log("  - aaaa1111-1111-1111-1111-111111111111 (Pizza Palace)");
        console.log("  - bbbb2222-2222-2222-2222-222222222222 (Burger Barn)");
        console.log("  - cccc3333-3333-3333-3333-333333333333 (Sushi Station)");
        console.log("Riders:");
        console.log("  - d1d1d1d1-1111-1111-1111-111111111111 (Mike Rider)");
        console.log("  - d2d2d2d2-2222-2222-2222-222222222222 (Sarah Driver)");
        console.log("  - d3d3d3d3-3333-3333-3333-333333333333 (Tom Courier)");
    } catch (error) {
        console.error("Seeding failed:", error);
        throw error;
    } finally {
        await postgresClient.close();
    }
}

seedDatabase().catch(console.error);
