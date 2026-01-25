import axios from "axios";

const API_URL = "http://localhost:5000/api";

async function testAuth() {
  console.log("🧪 Starting authentication tests...\n");

  const testEmail = `test${Date.now()}@example.com`;

  try {
    // Test 1: Signup
    console.log("📝 Test 1: Signup");
    console.log(`   Email: ${testEmail}`);

    const signupResponse = await axios.post(`${API_URL}/auth/signup`, {
      name: "Test User",
      email: testEmail,
      password: "Test@123",
      phone: "1234567890",
    });

    console.log("✅ Signup successful!");
    console.log("   Response:", {
      success: signupResponse.data.success,
      hasToken: !!signupResponse.data.token,
      user: signupResponse.data.user,
    });

    const token = signupResponse.data.token;

    // Test 2: Login
    console.log("\n📝 Test 2: Login");
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: testEmail,
      password: "Test@123",
    });

    console.log("✅ Login successful!");
    console.log("   Response:", {
      success: loginResponse.data.success,
      hasToken: !!loginResponse.data.token,
      user: loginResponse.data.user,
    });

    // Test 3: Get current user
    console.log("\n📝 Test 3: Get current user");
    const meResponse = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log("✅ Get user successful!");
    console.log("   User:", meResponse.data.user);

    console.log("\n✅ All tests passed!");
  } catch (error) {
    console.error("❌ Test failed!");
    console.error("   Error message:", error.message);
    console.error("   Full error:", error);
    if (error.response) {
      console.error("   Status:", error.response.status);
      console.error("   Data:", error.response.data);
    }
  }
}

testAuth();
