import requests
import sys
from datetime import datetime

class CineMapAPITester:
    def __init__(self, base_url="https://filmweb-navigator.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, params=None, data=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response keys: {list(response_data.keys()) if isinstance(response_data, dict) else 'Non-dict response'}")
                    return True, response_data
                except:
                    return True, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                return False, {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout (30s)")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        return self.run_test(
            "Root API Endpoint",
            "GET",
            "",
            200
        )

    def test_movie_search(self, query="Fight Club"):
        """Test movie search endpoint"""
        success, response = self.run_test(
            f"Movie Search - '{query}'",
            "GET",
            "movies/search",
            200,
            params={"query": query}
        )
        
        if success and isinstance(response, dict):
            # Validate response structure
            if 'results' in response and 'total_results' in response:
                results = response['results']
                print(f"   Found {len(results)} movies")
                if results:
                    movie = results[0]
                    required_fields = ['id', 'title', 'overview', 'vote_average']
                    missing_fields = [field for field in required_fields if field not in movie]
                    if missing_fields:
                        print(f"   ⚠️  Missing fields in movie data: {missing_fields}")
                    else:
                        print(f"   First movie: {movie['title']} (ID: {movie['id']}, Rating: {movie['vote_average']})")
                        return success, movie['id']  # Return movie ID for network test
            else:
                print(f"   ⚠️  Response missing required fields: results, total_results")
        
        return success, None

    def test_movie_network(self, movie_id=550):
        """Test movie network endpoint"""
        success, response = self.run_test(
            f"Movie Network - ID {movie_id}",
            "GET",
            f"movies/{movie_id}/network",
            200
        )
        
        if success and isinstance(response, dict):
            # Validate response structure
            if 'central_movie' in response and 'related_movies' in response:
                central = response['central_movie']
                related = response['related_movies']
                print(f"   Central movie: {central.get('title', 'Unknown')}")
                print(f"   Related movies: {len(related)}")
                
                # Check if we have the expected 8 related movies
                if len(related) == 8:
                    print(f"   ✅ Correct number of related movies (8)")
                else:
                    print(f"   ⚠️  Expected 8 related movies, got {len(related)}")
                
                # Validate movie data structure
                required_fields = ['id', 'title', 'overview', 'vote_average']
                for field in required_fields:
                    if field not in central:
                        print(f"   ⚠️  Central movie missing field: {field}")
                
                if related:
                    for i, movie in enumerate(related[:2]):  # Check first 2 related movies
                        missing_fields = [field for field in required_fields if field not in movie]
                        if missing_fields:
                            print(f"   ⚠️  Related movie {i+1} missing fields: {missing_fields}")
            else:
                print(f"   ⚠️  Response missing required fields: central_movie, related_movies")
        
        return success, response

    def test_status_endpoints(self):
        """Test status check endpoints"""
        # Test POST status
        test_data = {
            "client_name": f"test_client_{datetime.now().strftime('%H%M%S')}"
        }
        
        success_post, response_post = self.run_test(
            "Create Status Check",
            "POST",
            "status",
            200,
            data=test_data
        )
        
        # Test GET status
        success_get, response_get = self.run_test(
            "Get Status Checks",
            "GET",
            "status",
            200
        )
        
        return success_post and success_get

    def test_error_handling(self):
        """Test error handling for invalid requests"""
        # Test invalid movie ID
        success, _ = self.run_test(
            "Invalid Movie ID",
            "GET",
            "movies/99999999/network",
            200  # Should still return 200 with mock data
        )
        
        # Test empty search query
        success2, _ = self.run_test(
            "Empty Search Query",
            "GET",
            "movies/search",
            200,
            params={"query": ""}
        )
        
        return success and success2

def main():
    print("🎬 CineMap API Testing Suite")
    print("=" * 50)
    
    # Setup
    tester = CineMapAPITester()
    
    # Test 1: Root endpoint
    tester.test_root_endpoint()
    
    # Test 2: Movie search
    search_success, movie_id = tester.test_movie_search("Fight Club")
    
    # Test 3: Movie network (use movie ID from search if available)
    if movie_id:
        tester.test_movie_network(movie_id)
    else:
        tester.test_movie_network(550)  # Default Fight Club ID
    
    # Test 4: Different search query
    tester.test_movie_search("Forrest Gump")
    
    # Test 5: Status endpoints
    tester.test_status_endpoints()
    
    # Test 6: Error handling
    tester.test_error_handling()
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())