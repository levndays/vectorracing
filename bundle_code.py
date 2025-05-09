import os
import sys

def should_include(filepath, exclude_dirs, allowed_extensions):
    """Checks if a file should be included based on directory exclusions and extensions."""
    # Check if file is in an excluded directory
    # Use os.path.normpath for consistent path comparisons across OSs
    normalized_filepath = os.path.normpath(filepath)
    for excluded_dir in exclude_dirs:
        normalized_excluded_dir = os.path.normpath(excluded_dir)
        # Ensure we match full directory paths, not just substrings
        # Add a separator to the end of directory paths for accurate checking
        if normalized_filepath.startswith(normalized_excluded_dir + os.sep) or normalized_filepath == normalized_excluded_dir:
             return False

    # Check if file has an allowed extension
    _, ext = os.path.splitext(filepath)
    return ext.lower() in allowed_extensions

def bundle_code(root_dir=".", output_filename="bundled_code.txt"):
    """Bundles code files into a single text file, excluding the script and output files."""
    # --- Configuration ---
    # Add/remove directories to exclude (relative or absolute paths)
    exclude_dirs = [".git", "node_modules", "dist", "build", "venv", "__pycache__"]
    # Add/remove file extensions to include (case-insensitive)
    allowed_extensions = [
        ".py", ".js", ".html", ".css", ".md", ".txt", ".sh",
        ".yml", ".yaml", ".json", ".xml", ".java", ".c", ".cpp",
        ".h", ".hpp", ".cs", ".go", ".rb", ".php", ".swift", ".kt",
        ".scala", ".r", ".vue", ".jsx", ".tsx", ".sql"
    ] # Expanded list for common code types
    # ---------------------

    print(f"Bundling code from '{root_dir}' into '{output_filename}'...")
    print(f"Excluding directories: {exclude_dirs}")
    print(f"Including extensions: {allowed_extensions}")

    # Get the absolute path of the script file itself for exclusion
    abs_script_path = os.path.abspath(__file__)

    # Get the absolute path of the output file for exclusion
    # Resolve output_filename relative to root_dir, then get its absolute path
    abs_output_path = os.path.abspath(os.path.join(root_dir, output_filename))

    print(f"Excluding script file: {os.path.basename(abs_script_path)}")
    print(f"Excluding output file: {os.path.basename(abs_output_path)}")
    print("-" * 20) # Separator for clarity

    # Use UTF-8 encoding for wide compatibility
    with open(output_filename, "w", encoding="utf-8") as outfile:
        for subdir, dirs, files in os.walk(root_dir, topdown=True):
            # Option 1: Modify 'dirs' in place to prevent os.walk from entering excluded directories
            # This is more efficient for large projects with large excluded directories (like node_modules)
            dirs[:] = [d for d in dirs if os.path.normpath(os.path.join(subdir, d)) not in [os.path.normpath(ed) for ed in exclude_dirs]]

            # Check if the current subdirectory is excluded (handles cases where root_dir itself is an excluded dir)
            normalized_subdir = os.path.normpath(subdir)
            if normalized_subdir in [os.path.normpath(ed) for ed in exclude_dirs]:
                 # print(f"Skipping excluded directory: {subdir}") # Optional: uncomment to see skipped dirs
                 continue # Skip processing files in this directory

            for file in files:
                filepath = os.path.join(subdir, file)
                abs_filepath = os.path.abspath(filepath)

                # --- Exclusion Checks ---
                # 1. Exclude the script file itself
                if abs_filepath == abs_script_path:
                    print(f"Skipping script file: {filepath}")
                    continue

                # 2. Exclude the generated output file
                if abs_filepath == abs_output_path:
                    print(f"Skipping output file: {filepath}")
                    continue

                # 3. Exclude based on directory/extension rules (using the function)
                if not should_include(filepath, exclude_dirs, allowed_extensions):
                    # print(f"Skipping due to rules: {filepath}") # Optional: uncomment to see other skipped files
                    continue
                # --- End Exclusion Checks ---

                # If the file passes all checks, include it
                try:
                    # Use a relative path for the header
                    relative_filepath = os.path.relpath(filepath, root_dir)
                    outfile.write(f"### File: {relative_filepath} ###\n")
                    with open(filepath, "r", encoding="utf-8") as infile:
                        outfile.write(infile.read())
                    outfile.write("\n\n") # Add separation between files
                    # print(f"Included: {filepath}") # Optional: uncomment to see included files
                except Exception as e:
                    print(f"Could not read file {filepath} (Permission Error or Encoding Issue?): {e}")

        print("-" * 20) # Separator for clarity
        print("Bundling complete.")

if __name__ == "__main__":
    # You can optionally change the output filename here if you run the script directly
    bundle_code(output_filename="project_code_bundle.txt")

    # Or bundle from a specific directory:
    # bundle_code(root_dir="../my_other_project", output_filename="other_project.txt")