# RescueGrid

**Created by Tabish Syed**

RescueGrid is an interactive emergency supply routing simulator. Set a depot and a shelter on a fictional district map, add flood levels or close roads, then compare the quickest route with a route that avoids more risk. A small dispatch planner estimates how many vehicles are needed for the shelter's supply demand.

## Run

Open `index.html` in a browser. The project is a static site and has no install step, account, API key, or external service.

## Use the simulator

- Choose **Depot** or **Shelter**, then select a map tile to move that location.
- Choose **Flood** and a level from 1 to 3 to mark a tile, or choose **Close road** to block it.
- Choose **Clear tile** to remove a flood or closure.
- Adjust supply demand, vehicle capacity, and fleet size to see a dispatch estimate.
- Compare the **Quickest** and **Risk-aware** routes. Select a route card to emphasize its path.

The routes update as the map changes. If a closure disconnects the depot from the shelter, the planner reports that no route is available.

## How routing works

The map is a four-neighbor grid. RescueGrid runs Dijkstra's shortest-path algorithm twice:

- **Quickest** minimizes estimated travel cost. Flooded tiles add time.
- **Risk-aware** minimizes travel cost plus an extra penalty for flood exposure.

This makes the tradeoff visible without claiming that either route is suitable for a real emergency.

## Scope and limits

The district, road network, hazards, travel estimates, and supply demand are simulated examples. RescueGrid does not use live maps, weather, traffic, or emergency-service data. It is an educational planning demo, not an operational emergency response system.

## License

The original project code is available under the MIT License.