import React , {useState} from 'react';
import { useDataQuery } from '@dhis2/app-runtime';

const query = {
    trackedEntities: {
    resource:   "trackedEntityInstances",
    params: {
    ou:         "akV6429SUqu",
    ouMode:     "DESCENDANTS",
    program:    "wfd9K4dQVDR", 
      fields: [
                "trackedEntityInstance",
                "orgUnitName",               
                "created",                   
                "attributes",
                "enrollments",  
                "coordinates",               
      ],
      
      skipPaging: true
     
    },
  },
};
export default function SearchEntity() {
    const { loading, error, data } = useDataQuery(query);
    const [searchTerm, setSearchTerm] = useState('');
    if (loading) return <CircularLoader/>;
    if (error) return <p>Error: {error.message}</p>;

    const filteredEntities = data.trackedEntities 
        ? data.trackedEntities.trackedEntityInstances.filter(entity =>
            entity.attributes.some(attr =>
                attr.value.toLowerCase().includes(searchTerm.toLowerCase())
            )
        ) 
        : [];

    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
    };

    const handleEntityClick = (entity) => {
        if (onEntitySelect) {
            onEntitySelect(entity); // Call the parent callback with entity data
        }
    };
    return (

        <div>
            <InputField
                label="Search for a tracked entity"
                value={searchTerm}
                onChange={({ value }) => handleSearchChange(value)}
            />
            <ul>
                {filteredEntities.map(entity => (
                    <li 
                        key={entity.trackedEntityInstance} 
                        onClick={() => handleEntityClick(entity)}
                    >
                        {entity.attributes.find(attr => attr.name === 'name')?.value || 'Unnamed Entity'}
                    </li>
                ))}
            </ul>
        </div>
    );
}