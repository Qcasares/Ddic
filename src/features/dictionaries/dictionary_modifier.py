def modify_dictionary(dictionary, operation, key=None, value=None):
    """
    Modify a dictionary with operations: add, update, delete.
    
    Args:
        dictionary (dict): The input dictionary to modify
        operation (str): Operation to perform ('add', 'update', 'delete')
        key: Key to operate on
        value: Value to set (for add/update operations)
    
    Returns:
        dict: The modified dictionary
        
    Raises:
        ValueError: If invalid operation or parameters are provided
        TypeError: If dictionary argument is not a dict
        KeyError: If key not found for update/delete operations
    """
    if not isinstance(dictionary, dict):
        raise TypeError("Input must be a dictionary")
        
    if operation not in ['add', 'update', 'delete']:
        raise ValueError("Invalid operation. Use 'add', 'update', or 'delete'")
        
    if operation in ['add', 'update', 'delete'] and key is None:
        raise ValueError("Key must be provided for add/update/delete operations")
        
    if operation in ['add', 'update'] and value is None:
        raise ValueError("Value must be provided for add/update operations")
    
    # Create a copy to avoid modifying the original
    result = dictionary.copy()
    
    try:
        if operation == 'add':
            if key in result:
                raise ValueError(f"Key '{key}' already exists. Use update operation instead")
            result[key] = value
            
        elif operation == 'update':
            if key not in result:
                raise KeyError(f"Key '{key}' not found. Use add operation for new keys")
            result[key] = value
            
        elif operation == 'delete':
            if key not in result:
                raise KeyError(f"Key '{key}' not found")
            del result[key]
            
    except Exception as e:
        raise type(e)(str(e))
        
    return result

# Example usage and tests
if __name__ == "__main__":
    # Initial dictionary
    sample_dict = {"name": "John", "age": 30}
    
    # Example 1: Adding a new key-value pair
    try:
        modified = modify_dictionary(sample_dict, 'add', 'city', 'New York')
        print("After adding:", modified)
        # Output: {'name': 'John', 'age': 30, 'city': 'New York'}
    except Exception as e:
        print(f"Error adding: {e}")
    
    # Example 2: Updating an existing value
    try:
        modified = modify_dictionary(sample_dict, 'update', 'age', 31)
        print("After updating:", modified)
        # Output: {'name': 'John', 'age': 31}
    except Exception as e:
        print(f"Error updating: {e}")
    
    # Example 3: Deleting a key
    try:
        modified = modify_dictionary(sample_dict, 'delete', 'age')
        print("After deleting:", modified)
        # Output: {'name': 'John'}
    except Exception as e:
        print(f"Error deleting: {e}")
    
    # Example 4: Error handling - Invalid operation
    try:
        modify_dictionary(sample_dict, 'invalid')
    except ValueError as e:
        print(f"Error handling invalid operation: {e}")
    
    # Example 5: Error handling - Key exists (add operation)
    try:
        modify_dictionary(sample_dict, 'add', 'name', 'Jane')
    except ValueError as e:
        print(f"Error handling existing key: {e}")
    
    # Example 6: Error handling - Key not found (update operation)
    try:
        modify_dictionary(sample_dict, 'update', 'invalid_key', 'value')
    except KeyError as e:
        print(f"Error handling missing key: {e}")