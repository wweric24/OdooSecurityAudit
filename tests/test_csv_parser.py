"""Tests for CSV parser."""
import unittest
import os
import tempfile
import csv
from app.data.csv_parser import CSVParser, HTMLTextExtractor


class TestHTMLTextExtractor(unittest.TestCase):
    """Test HTML text extraction."""
    
    def setUp(self):
        self.parser = HTMLTextExtractor()
    
    def test_simple_html(self):
        """Test extracting text from simple HTML."""
        html = "<p>This is a test</p>"
        self.parser.feed(html)
        result = self.parser.get_text()
        self.assertIn("This is a test", result)
    
    def test_html_with_br(self):
        """Test HTML with line breaks."""
        html = "<p>Line 1<br>Line 2</p>"
        self.parser.text = []
        self.parser.feed(html)
        result = self.parser.get_text()
        self.assertIn("Line 1", result)
        self.assertIn("Line 2", result)
    
    def test_empty_html(self):
        """Test empty HTML."""
        html = ""
        self.parser.text = []
        self.parser.feed(html)
        result = self.parser.get_text()
        self.assertEqual(result, "")
    
    def test_none_html(self):
        """Test None HTML."""
        text, original = CSVParser().parse_html(None)
        self.assertEqual(text, "")
        self.assertEqual(original, "")


class TestCSVParser(unittest.TestCase):
    """Test CSV parser functionality."""
    
    def setUp(self):
        self.parser = CSVParser('app/config/standards.json')
    
    def test_extract_module_and_access_level(self):
        """Test module and access level extraction."""
        # Standard format
        module, access_level, level = self.parser.extract_module_and_access_level(
            "Odoo - Project / App Administrator"
        )
        self.assertEqual(module, "Project")
        self.assertEqual(access_level, "App Administrator")
        self.assertEqual(level, 1)
        
        # Non-standard format
        module, access_level, level = self.parser.extract_module_and_access_level(
            "Administration / Access Rights"
        )
        self.assertIsNotNone(module)
    
    def test_detect_hierarchy_level(self):
        """Test hierarchy level detection."""
        self.assertEqual(self.parser._detect_hierarchy_level("App Administrator"), 1)
        self.assertEqual(self.parser._detect_hierarchy_level("Manager"), 2)
        self.assertEqual(self.parser._detect_hierarchy_level("User"), 3)
        self.assertEqual(self.parser._detect_hierarchy_level("Read Only"), 4)
        self.assertIsNone(self.parser._detect_hierarchy_level("Unknown"))
    
    def test_parse_simple_csv(self):
        """Test parsing a simple CSV."""
        # Create a temporary CSV file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow(['Group Name', 'Group Purpose', 'Group Status', 'User Access', 'Users', 'Inherits'])
            writer.writerow(['Test Group', '<p>Test purpose</p>', 'Confirmed', '<p>Test access</p>', 'User1', 'Parent Group'])
            writer.writerow(['', '', '', '', 'User2', ''])
            temp_file = f.name
        
        try:
            groups = self.parser.parse_csv(temp_file)
            self.assertEqual(len(groups), 1)
            self.assertEqual(groups[0]['name'], 'Test Group')
            self.assertEqual(len(groups[0]['users']), 2)
            self.assertIn('User1', groups[0]['users'])
            self.assertIn('User2', groups[0]['users'])
        finally:
            os.unlink(temp_file)
    
    def test_parse_real_csv(self):
        """Test parsing the actual CSV file."""
        csv_path = 'reference docs/Access Groups (res.groups).csv'
        if os.path.exists(csv_path):
            groups = self.parser.parse_csv(csv_path)
            self.assertGreater(len(groups), 0)
            # Check first group has required fields
            if len(groups) > 0:
                self.assertIn('name', groups[0])
                self.assertIn('users', groups[0])
                self.assertIn('status', groups[0])
    
    def test_validate_data(self):
        """Test data validation."""
        groups = [
            {
                'name': 'Odoo - Test / User',
                'purpose': 'Test purpose',
                'users': ['User1'],
                'status': 'Confirmed',
                'follows_naming_convention': True
            },
            {
                'name': 'Invalid Group',
                'purpose': '',
                'users': [],
                'status': 'Under Review',
                'follows_naming_convention': False
            }
        ]
        
        validation = self.parser.validate_data(groups)
        self.assertEqual(validation['total_groups'], 2)
        self.assertEqual(validation['statistics']['follows_naming_convention'], 1)
        self.assertGreater(len(validation['warnings']), 0)


if __name__ == '__main__':
    unittest.main()

