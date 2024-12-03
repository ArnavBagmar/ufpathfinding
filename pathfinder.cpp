#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include <queue>
#include <unordered_map>
#include <cmath>
#include <limits>
#include <algorithm>

struct Point {
    int x, y;
    int path_id;

    bool operator==(const Point& other) const {
        return x == other.x && y == other.y;
    }
};

// Hash function for pair (used in unordered_map)
struct PairHash {
    template <typename T1, typename T2>
    std::size_t operator()(const std::pair<T1, T2>& pair) const {
        auto hash1 = std::hash<T1>{}(pair.first);
        auto hash2 = std::hash<T2>{}(pair.second);
        return hash1 ^ (hash2 << 1);
    }
};

// Heuristic: Euclidean distance
double heuristic(const Point& a, const Point& b) {
    return std::sqrt(std::pow(a.x - b.x, 2) + std::pow(a.y - b.y, 2));
}

class PathFinder {
private:
    std::unordered_map<std::pair<int, int>, Point, PairHash> valid_points;

    // Find the nearest valid point to a given coordinate
    Point findNearestValidPoint(int x, int y) {
        double min_dist = std::numeric_limits<double>::max();
        Point nearest = {x, y, -1};

        for (const auto& [coord, point] : valid_points) {
            double dist = heuristic(Point{x, y, 0}, point);
            if (dist < min_dist) {
                min_dist = dist;
                nearest = point;
            }
        }

        return nearest;
    }

    // Get valid neighbors (8 directions, including diagonals)
    std::vector<Point> getNeighbors(const Point& p) {
        std::vector<Point> neighbors;
        for (int dx = -1; dx <= 1; dx++) {
            for (int dy = -1; dy <= 1; dy++) {
                if (dx == 0 && dy == 0) continue;

                auto neighbor_coord = std::make_pair(p.x + dx, p.y + dy);
                if (valid_points.count(neighbor_coord)) {
                    neighbors.push_back(valid_points[neighbor_coord]);
                }
            }
        }
        return neighbors;
    }

public:
    // Load points from a CSV file
    bool loadPoints(const std::string& filename) {
        std::ifstream file(filename);
        if (!file.is_open()) {
            std::cerr << "Failed to open file: " << filename << std::endl;
            return false;
        }

        std::string line;
        std::getline(file, line); // Skip header

        while (std::getline(file, line)) {
            std::stringstream ss(line);
            std::string x_str, y_str, path_str;

            if (!std::getline(ss, x_str, ',') || 
                !std::getline(ss, y_str, ',') || 
                !std::getline(ss, path_str, ',')) {
                continue;
            }

            try {
                Point p = {std::stoi(x_str), std::stoi(y_str), std::stoi(path_str)};
                valid_points[{p.x, p.y}] = p;
            } catch (const std::exception& e) {
                std::cerr << "Error parsing line: " << line << std::endl;
            }
        }
        return true;
    }

    // A* algorithm to find the shortest path
    std::vector<Point> findPath(int start_x, int start_y, int end_x, int end_y) {
        Point start = findNearestValidPoint(start_x, start_y);
        Point end = findNearestValidPoint(end_x, end_y);

        if (start.path_id == -1 || end.path_id == -1) {
            std::cerr << "Start or End point not found in valid points." << std::endl;
            return {};
        }

        // Priority queue for open set (f_cost, Point)
        auto compare = [](const std::pair<double, Point>& a, const std::pair<double, Point>& b) {
            return a.first > b.first;
        };
        std::priority_queue<std::pair<double, Point>, std::vector<std::pair<double, Point>>, decltype(compare)> open_set(compare);

        // Visited map to track g_cost for each point
        std::unordered_map<std::pair<int, int>, double, PairHash> g_cost;
        std::unordered_map<std::pair<int, int>, Point, PairHash> parent;

        g_cost[{start.x, start.y}] = 0;
        open_set.push({heuristic(start, end), start});

        while (!open_set.empty()) {
            auto [current_f_cost, current] = open_set.top();
            open_set.pop();

            // If the target is reached, reconstruct the path
            if (current == end) {
                std::vector<Point> path;
                while (parent.count({current.x, current.y})) {
                    path.push_back(current);
                    current = parent[{current.x, current.y}];
                }
                path.push_back(start);
                std::reverse(path.begin(), path.end());
                return path;
            }

            for (const Point& neighbor : getNeighbors(current)) {
                double tentative_g_cost = g_cost[{current.x, current.y}] + heuristic(current, neighbor);

                if (!g_cost.count({neighbor.x, neighbor.y}) || tentative_g_cost < g_cost[{neighbor.x, neighbor.y}]) {
                    g_cost[{neighbor.x, neighbor.y}] = tentative_g_cost;
                    parent[{neighbor.x, neighbor.y}] = current;

                    double f_cost = tentative_g_cost + heuristic(neighbor, end);
                    open_set.push({f_cost, neighbor});
                }
            }
        }

        std::cerr << "No path found." << std::endl;
        return {};
    }

std::vector<Point> findPathDijkstra(int start_x, int start_y, int end_x, int end_y) {
        Point start = findNearestValidPoint(start_x, start_y);
        Point end = findNearestValidPoint(end_x, end_y);

        if (start.path_id == -1 || end.path_id == -1) {
            std::cerr << "Start or End point not found in valid points." << std::endl;
            return {};
        }

        auto compare = [](const std::pair<double, Point>& a, const std::pair<double, Point>& b) {
            return a.first > b.first;
        };
        std::priority_queue<std::pair<double, Point>, std::vector<std::pair<double, Point>>, decltype(compare)> open_set(compare);

        std::unordered_map<std::pair<int, int>, double, PairHash> distance;
        std::unordered_map<std::pair<int, int>, Point, PairHash> parent;

        for (const auto& [coord, point] : valid_points) {
            distance[coord] = std::numeric_limits<double>::infinity();
        }

        distance[{start.x, start.y}] = 0;
        open_set.push({0, start});

        while (!open_set.empty()) {
            auto [current_distance, current] = open_set.top();
            open_set.pop();

            if (current == end) {
                std::vector<Point> path;
                while (parent.count({current.x, current.y})) {
                    path.push_back(current);
                    current = parent[{current.x, current.y}];
                }
                path.push_back(start);
                std::reverse(path.begin(), path.end());
                return path;
            }

            for (const Point& neighbor : getNeighbors(current)) {
                double new_distance = distance[{current.x, current.y}] + heuristic(current, neighbor);

                if (new_distance < distance[{neighbor.x, neighbor.y}]) {
                    distance[{neighbor.x, neighbor.y}] = new_distance;
                    parent[{neighbor.x, neighbor.y}] = current;
                    open_set.push({new_distance, neighbor});
                }
            }
        }

        std::cerr << "No path found." << std::endl;
        return {};
    }
};

int main(int argc, char* argv[]) {
    if (argc != 6) {
        std::cerr << "Usage: " << argv[0] << " <startX> <startY> <endX> <endY> <algorithm>" << std::endl;
        std::cerr << "Algorithm: 0 for A*, 1 for Dijkstra" << std::endl;
        return 1;
    }

    try {
        int startX = std::stoi(argv[1]);
        int startY = std::stoi(argv[2]);
        int endX = std::stoi(argv[3]);
        int endY = std::stoi(argv[4]);
        int algorithm = std::stoi(argv[5]);

        PathFinder finder;
        if (!finder.loadPoints("map_data.csv")) {
            return 1;
        }

        std::vector<Point> path;
        if (algorithm == 0) {
            path = finder.findPath(startX, startY, endX, endY);  // A*
        } else if (algorithm == 1) {
            path = finder.findPathDijkstra(startX, startY, endX, endY);  // Dijkstra
        } else {
            std::cerr << "Invalid algorithm choice. Use 0 for A* or 1 for Dijkstra." << std::endl;
            return 1;
        }

        if (path.empty()) {
            return 1;
        }

        for (const auto& point : path) {
            std::cout << point.x << "," << point.y << std::endl;
        }

        return 0;
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
}