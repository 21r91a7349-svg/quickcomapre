import urllib.request
import json

def test_url(name, url, headers=None):
    if headers is None:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
    req = urllib.request.Request(url, headers=headers)
    try:
        res = urllib.request.urlopen(req, timeout=10)
        print(f"{name}: Success (200). Content-Length: {len(res.read())}")
    except urllib.error.HTTPError as e:
        server = e.headers.get('Server', 'Unknown')
        print(f"{name}: Blocked ({e.code}) by {server}")
    except Exception as e:
        print(f"{name}: Failed - {str(e)}")

print("--- Testing BigBasket ---")
test_url("BB Home", "https://www.bigbasket.com/")
test_url("BB API Search", "https://www.bigbasket.com/custompage/getsearchdata/?slug=milk")
test_url("BB BBNOW API", "https://www.bigbasket.com/bbnow/api/v4/search/products/")

print("\\n--- Testing Swiggy ---")
test_url("Swiggy Instamart", "https://www.swiggy.com/instamart")
test_url("Swiggy API Search", "https://www.swiggy.com/api/instamart/search?query=milk")
