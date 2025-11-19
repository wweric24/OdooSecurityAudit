"""Tests for data models."""
import unittest
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.data.models import Base, SecurityGroup, User
from datetime import date


class TestModels(unittest.TestCase):
    """Test database models."""
    
    def setUp(self):
        """Set up test database."""
        self.engine = create_engine('sqlite:///:memory:')
        Base.metadata.create_all(self.engine)
        Session = sessionmaker(bind=self.engine)
        self.session = Session()
    
    def tearDown(self):
        """Clean up."""
        self.session.close()
        Base.metadata.drop_all(self.engine)
    
    def test_create_security_group(self):
        """Test creating a security group."""
        group = SecurityGroup(
            name="Test Group",
            module="Test",
            access_level="User",
            hierarchy_level=3,
            status="Confirmed",
            purpose="Test purpose"
        )
        self.session.add(group)
        self.session.commit()
        
        retrieved = self.session.query(SecurityGroup).filter_by(name="Test Group").first()
        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved.module, "Test")
        self.assertEqual(retrieved.hierarchy_level, 3)
    
    def test_create_user(self):
        """Test creating a user."""
        user = User(name="Test User", email="test@example.com")
        self.session.add(user)
        self.session.commit()
        
        retrieved = self.session.query(User).filter_by(name="Test User").first()
        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved.email, "test@example.com")
    
    def test_user_group_association(self):
        """Test user-group association."""
        group = SecurityGroup(name="Test Group", status="Confirmed")
        user = User(name="Test User")
        
        group.users.append(user)
        self.session.add(group)
        self.session.add(user)
        self.session.commit()
        
        self.assertEqual(len(group.users), 1)
        self.assertEqual(len(user.groups), 1)
        self.assertEqual(user.groups[0].name, "Test Group")
    
if __name__ == '__main__':
    unittest.main()

