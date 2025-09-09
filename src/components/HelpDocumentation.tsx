import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Search, HelpCircle } from "lucide-react";

interface HelpSection {
  id: string;
  title: string;
  content: string;
  searchableText: string;
}

const helpSections: HelpSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    content: `Before importing any data, make sure you have:
• Your custom objects already created in GoHighLevel
• The **Object Key** for each custom object you want to work with
• Your CSV files formatted according to the templates provided

The **Object Key** is a unique identifier for your custom object, formatted like \`custom_objects.your_object_name\`. You can find this in your custom object settings.

**Example:** If you created a "Products" object, the key might be \`custom_objects.products\``,
    searchableText: "getting started before importing custom objects object key csv templates unique identifier"
  },
  {
    id: "custom-objects",
    title: "Custom Objects",
    content: `### What is a Custom Object?
A custom object is a data structure you create in GoHighLevel to store specific information for your business (like Products, Services, Inventory, etc.).

### Object Key
The **Object Key** is a unique identifier for your custom object. In GoHighLevel, it's formatted like \`custom_objects.your_object_name\`. You can find this in your custom object settings.

**Example:** If you created a "Products" object, the key might be \`custom_objects.products\``,
    searchableText: "custom objects data structure products services inventory object key unique identifier"
  },
  {
    id: "custom-fields",
    title: "Custom Fields",
    content: `### What are Custom Fields?
Custom fields define what information you can store in your custom objects (like "Product Name", "Price", "Description", etc.).

### Field Properties You Can Import:
• **name** - Display name of the field (Required) - Example: "Product Name"
• **data_type** - Type of data this field stores (Required) - Example: "TEXT", "EMAIL", "PHONE"
• **description** - Help text for the field (Optional) - Example: "Enter the product name"
• **placeholder** - Example text shown in forms (Optional) - Example: "e.g., Widget Pro 2000"
• **show_in_forms** - Show this field in forms (Optional) - "true" or "false"
• **options** - Dropdown/checkbox options (Optional) - "Option1|Option2|Option3"
• **accepted_formats** - File types allowed for file uploads (Optional) - ".jpg,.png,.pdf"
• **max_file_limit** - Maximum files allowed (Optional) - "5"
• **allow_custom_option** - Allow users to add custom options (Optional) - "true" or "false"
• **existing_folder_id** - ID of the folder to organize fields (Optional) - "folder_abc123"

### Supported Field Types:
• **TEXT** - Short text input
• **LARGE_TEXT** - Long text area
• **EMAIL** - Email address
• **PHONE** - Phone number
• **DATE** - Date picker
• **NUMERICAL** - Numbers only
• **MONETORY** - Currency amounts
• **CHECKBOX** - Yes/no checkboxes
• **SINGLE_OPTIONS** - Dropdown (pick one)
• **MULTIPLE_OPTIONS** - Checkboxes (pick many)
• **RADIO** - Radio buttons
• **FILE_UPLOAD** - File attachments
• **TEXTBOX_LIST** - Multiple text entries

### How to Import Custom Fields:
1. Download the field template for your object
2. Fill in your field information
3. Upload the CSV file
4. Review the results`,
    searchableText: "custom fields product name price description data types text email phone date numerical monetory checkbox single options multiple options radio file upload textbox list template csv"
  },
  {
    id: "custom-records",
    title: "Custom Records",
    content: `### What are Custom Records?
Custom records are the actual data entries in your custom objects (like individual products, services, or inventory items).

### How Record Import Works:
The system automatically detects whether you're creating new records or updating existing ones:
• **Creating New Records:** Don't include an \`id\` column - the system will create new records
• **Updating Existing Records:** Include the \`id\` column with the record ID you want to update

### Record Templates:
• **Create Mode:** Download a template with just your field columns
• **Update Mode:** Download a template that includes existing record data with IDs

### How to Import Records:
1. Download the appropriate template (Create or Update)
2. Fill in your data according to your custom fields
3. Upload the CSV file
4. Review the import results`,
    searchableText: "custom records data entries products services inventory create update records id column template"
  },
  {
    id: "custom-values",
    title: "Custom Values",
    content: `### What are Custom Values?
Custom values are global key-value pairs you can use across your entire GoHighLevel account (like company settings, default values, etc.).

### Custom Values CSV Format:
• **name** - Name/key of the custom value (Required) - Example: "Default Tax Rate"
• **value** - The value to store (Required) - Example: "8.5%"

### Create vs Update:
• **Create New:** Use template without \`id\` column
• **Update Existing:** Use template with \`id\` column for values you want to modify

### How to Import Custom Values:
1. Download the create or update template
2. Enter your key-value pairs
3. Upload the CSV file
4. Review the results`,
    searchableText: "custom values global key-value pairs company settings default values tax rate template create update"
  },
  {
    id: "associations",
    title: "Associations (Relationships)",
    content: `### What are Associations?
Associations create relationships between different custom object records (like linking a Product to a Customer, or a Service to an Order).

### Association CSV Format:
• **association_id** - ID of the association type (Required) - Example: "assoc_abc123"
• **first_record_id** - ID of the first record (Required) - Example: "product_rec_456"
• **second_record_id** - ID of the second record (Required) - Example: "customer_rec_789"

### Dynamic Templates:
For specific associations, you can download templates that use meaningful column names based on your objects (like \`product_record_id\` and \`customer_record_id\` instead of generic names).

### How to Import Associations:
1. Make sure both records exist in their respective objects
2. Download the association template
3. Fill in the record IDs you want to link
4. Upload the CSV file
5. Review the relationships created`,
    searchableText: "associations relationships custom object records product customer service order association id first record second record dynamic templates"
  },
  {
    id: "templates-downloads",
    title: "Templates and Downloads",
    content: `### Available Templates:
• **Object Templates:** Basic structure for creating objects
• **Field Templates:** For adding custom fields to objects
• **Record Templates:** For importing data into objects (Create/Update modes)
• **Custom Values Templates:** For managing global values (Create/Update modes)
• **Association Templates:** For creating relationships between records

### Template Features:
• Pre-filled examples showing correct format
• Proper column headers
• Data type examples
• Required vs optional field indicators`,
    searchableText: "templates downloads object field record custom values association pre-filled examples column headers data type required optional"
  },
  {
    id: "import-process",
    title: "Import Process",
    content: `### General Steps:
1. **Select Operation:** Choose what you want to import (fields, records, etc.)
2. **Choose Object:** Select the custom object you're working with
3. **Download Template:** Get the correctly formatted CSV template
4. **Fill Template:** Add your data following the examples
5. **Upload File:** Submit your completed CSV
6. **Review Results:** Check success/error reports

### Import Results:
After each import, you'll see:
• **Total Processed:** How many rows were in your CSV
• **Successfully Created:** New items added
• **Successfully Updated:** Existing items modified
• **Errors:** Items that failed with reasons why

### Common Error Reasons:
• Missing required fields
• Invalid data types
• References to non-existent records
• Formatting issues in CSV
• Duplicate entries`,
    searchableText: "import process select operation choose object download template fill upload file review results total processed successfully created updated errors missing required fields invalid data types formatting duplicate entries"
  },
  {
    id: "tips-success",
    title: "Tips for Success",
    content: `### CSV Formatting:
• Use UTF-8 encoding
• Keep field names exactly as shown in templates
• Use pipe separators (|) for multiple options
• Wrap text containing commas in quotes
• Don't leave required fields empty

### Data Validation:
• Email fields must be valid email addresses
• Phone fields should include area codes
• Date fields use YYYY-MM-DD format
• File upload fields should be URLs to accessible files
• Boolean fields use "true" or "false"

### Best Practices:
• Test with small batches first
• Keep backups of your original data
• Use descriptive names for fields and objects
• Organize fields into folders when possible
• Validate record IDs before creating associations`,
    searchableText: "tips success csv formatting utf-8 encoding field names pipe separators quotes required fields data validation email phone date file upload boolean best practices small batches backups descriptive names folders"
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    content: `### Common Issues:

**"Object key required"**
Make sure you're using the full object key (e.g., \`custom_objects.products\`)

**"Field validation failed"**
• Check that required fields are filled
• Verify data types match field requirements

**"Record not found"**
• Ensure record IDs exist before creating associations
• Check for typos in ID values

**"Version header was not found"**
This is a system error - try the import again

**"Authentication failed"**
Your session may have expired - refresh and try again

For technical support, use the feedback form in the application.`,
    searchableText: "troubleshooting common issues object key required field validation failed record not found version header authentication failed system error session expired technical support feedback form"
  }
];

export function HelpDocumentation() {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const filteredSections = helpSections.filter(section =>
    section.searchableText.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const formatContent = (content: string) => {
    return content.split('\n').map((line, index) => {
      // Handle headers
      if (line.startsWith('### ')) {
        return <h4 key={index} className="font-semibold text-foreground mt-4 mb-2">{line.replace('### ', '')}</h4>;
      }
      // Handle bold text
      if (line.includes('**')) {
        const parts = line.split('**');
        return (
          <p key={index} className="mb-2">
            {parts.map((part, i) => 
              i % 2 === 1 ? <strong key={i} className="font-medium">{part}</strong> : part
            )}
          </p>
        );
      }
      // Handle bullet points
      if (line.startsWith('• ')) {
        return <li key={index} className="ml-4 mb-1">{line.replace('• ', '')}</li>;
      }
      // Handle code
      if (line.includes('`')) {
        const parts = line.split('`');
        return (
          <p key={index} className="mb-2">
            {parts.map((part, i) => 
              i % 2 === 1 ? <code key={i} className="bg-muted px-1 py-0.5 rounded text-sm font-mono">{part}</code> : part
            )}
          </p>
        );
      }
      // Regular paragraphs
      if (line.trim()) {
        return <p key={index} className="mb-2">{line}</p>;
      }
      return <br key={index} />;
    });
  };

  return (
    <Card id="help-documentation">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          Help Documentation
        </CardTitle>
        <CardDescription>
          Complete guide to using the Custom Data Importer
        </CardDescription>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search documentation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2">
          {filteredSections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No results found</p>
              <p className="text-sm">Try a different search term</p>
            </div>
          ) : (
            filteredSections.map((section) => {
              const isExpanded = expandedSections.has(section.id);
              
              return (
                <Collapsible key={section.id} open={isExpanded} onOpenChange={() => toggleSection(section.id)}>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <h3 className="font-medium text-left">{section.title}</h3>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="ml-8 mr-4 mb-4 p-4 bg-muted/20 rounded-lg">
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        {formatContent(section.content)}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}